import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import {
  DEFAULT_PORTS, LIVE_CAPABILITIES, isDriverProtocol,
  type ApiErrorCode, type CommandDto, type DriverProtocol, type HealthDto, type TargetDto,
} from '../../shared/api.ts'
import { DRIVERS } from './drivers/index.ts'
import type { DriverTarget } from './drivers/types.ts'
import { DeviceError } from './net/tcp.ts'
import { scanSubnet, SCAN_PROTOCOLS } from './scan.ts'
import { isValidProjectId, validateSnapshot, type ProjectStore } from './store.ts'
import { extractToken, isAllowedHost, isValidSubnetPrefix, tokenMatches } from './security.ts'

const MAX_BODY = 64 * 1024
const MAX_PROJECT_BODY = 2 * 1024 * 1024
const DEFAULT_TIMEOUT_MS = 3000

const STATUS: Record<ApiErrorCode, number> = {
  'bad-request': 400, 'forbidden-host': 403, unsupported: 501,
  unauthorized: 401, 'not-found': 404, connect: 502, timeout: 504, auth: 502, protocol: 502, device: 502,
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(text) })
  res.end(text)
}

function sendError(res: http.ServerResponse, err: unknown): void {
  if (err instanceof DeviceError) return sendJson(res, STATUS[err.code], { error: { code: err.code, message: err.message } })
  console.error(err)
  sendJson(res, 500, { error: { code: 'protocol', message: 'Internal server error' } })
}

async function readJson(req: http.IncomingMessage, maxBody = MAX_BODY): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > maxBody) throw new DeviceError('bad-request', 'Request body too large')
    chunks.push(chunk as Buffer)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch { throw new DeviceError('bad-request', 'Body is not valid JSON') }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function parseTarget(raw: unknown): { protocol: DriverProtocol; target: DriverTarget } {
  if (!isObject(raw) || typeof raw.ip !== 'string' || !isObject(raw.protocol)) throw new DeviceError('bad-request', 'Missing target.ip / target.protocol')
  const t = raw as unknown as TargetDto
  if (!isAllowedHost(t.ip)) throw new DeviceError('forbidden-host', `${t.ip} is not a private/loopback IPv4 address`)
  if (!isDriverProtocol(t.protocol.type)) throw new DeviceError('unsupported', `No live driver for protocol "${t.protocol.type}"`)
  const protocol = t.protocol.type
  const port = t.protocol.port ?? DEFAULT_PORTS[protocol]
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new DeviceError('bad-request', 'Invalid port')
  return { protocol, target: { host: t.ip, port, username: t.protocol.username, password: t.protocol.password, timeoutMs: DEFAULT_TIMEOUT_MS } }
}

function requireCapability(protocol: DriverProtocol, cap: 'raw' | CommandDto['kind']): void {
  if (!LIVE_CAPABILITIES[protocol].includes(cap)) throw new DeviceError('unsupported', `${protocol} does not support "${cap}"`)
}

async function handleApi(req: http.IncomingMessage, res: http.ServerResponse, url: URL, token?: string, store?: ProjectStore): Promise<void> {
  const route = `${req.method} ${url.pathname}`
  const authorized = token === undefined || tokenMatches(token, extractToken(req.headers.authorization, url))

  // Health luôn mở để web biết có gateway và có cần token hay không.
  if (route === 'GET /api/health') {
    const body: HealthDto = { ok: true, drivers: LIVE_CAPABILITIES, authRequired: token !== undefined, authorized }
    return sendJson(res, 200, body)
  }
  if (!authorized) throw new DeviceError('unauthorized', 'Missing or invalid gateway token')

  const projectMatch = /^\/api\/projects(?:\/([^/]+))?$/.exec(url.pathname)
  if (projectMatch) {
    if (!store) throw new DeviceError('unsupported', 'Project storage is not enabled on this gateway')
    const id = projectMatch[1] ? decodeURIComponent(projectMatch[1]) : undefined
    if (id === undefined && req.method === 'GET') return sendJson(res, 200, store.list())
    if (id !== undefined) {
      if (!isValidProjectId(id)) throw new DeviceError('bad-request', 'Invalid project id')
      if (req.method === 'GET') {
        const snapshot = store.load(id)
        if (!snapshot) throw new DeviceError('not-found', `No project "${id}"`)
        return sendJson(res, 200, snapshot)
      }
      if (req.method === 'PUT') {
        const snapshot = validateSnapshot(await readJson(req, MAX_PROJECT_BODY))
        if (snapshot.project.id !== id) throw new DeviceError('bad-request', 'project.id does not match the URL')
        return sendJson(res, 200, store.save(snapshot))
      }
      if (req.method === 'DELETE') {
        if (!store.remove(id)) throw new DeviceError('not-found', `No project "${id}"`)
        return sendJson(res, 200, { ok: true })
      }
    }
  }

  if (route === 'GET /api/scan') {
    const subnet = url.searchParams.get('subnet') ?? ''
    if (!isValidSubnetPrefix(subnet)) throw new DeviceError('bad-request', 'subnet must be a private "a.b.c" prefix')
    const abort = new AbortController()
    res.on('close', () => abort.abort())
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
    const emit = (event: string, data: unknown) => { if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`) }
    await scanSubnet({
      subnet, protocols: SCAN_PROTOCOLS, signal: abort.signal,
      onProgress: (pct, ip) => emit('progress', { pct, ip }),
      onFound: found => emit('found', found),
    })
    emit('done', {})
    res.end()
    return
  }

  if (req.method === 'POST' && ['/api/devices/status', '/api/devices/command', '/api/devices/raw'].includes(url.pathname)) {
    const body = await readJson(req)
    if (!isObject(body)) throw new DeviceError('bad-request', 'Body must be an object')
    const { protocol, target } = parseTarget(body.target)
    const driver = DRIVERS[protocol]

    if (url.pathname === '/api/devices/status') return sendJson(res, 200, await driver.status(target))

    if (url.pathname === '/api/devices/command') {
      if (!isObject(body.command) || typeof body.command.kind !== 'string') throw new DeviceError('bad-request', 'Missing command.kind')
      const command = body.command as unknown as CommandDto
      requireCapability(protocol, command.kind)
      await driver.command(target, command)
      return sendJson(res, 200, { ok: true })
    }

    if (typeof body.text !== 'string' || body.text.length === 0 || body.text.length > 256) throw new DeviceError('bad-request', 'text must be 1–256 characters')
    requireCapability(protocol, 'raw')
    return sendJson(res, 200, { reply: await driver.raw(target, body.text) })
  }

  throw new DeviceError('bad-request', `Unknown route ${route}`)
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json',
}

function serveStatic(dir: string, url: URL, res: http.ServerResponse): void {
  const requested = path.normalize(path.join(dir, decodeURIComponent(url.pathname)))
  const file = requested.startsWith(dir) && fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(dir, 'index.html')
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
}

export function createServer(options: { staticDir?: string; token?: string; store?: ProjectStore } = {}): http.Server {
  const staticDir = options.staticDir && fs.existsSync(options.staticDir) ? path.resolve(options.staticDir) : undefined
  return http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname.startsWith('/api/')) {
      handleApi(req, res, url, options.token, options.store).catch(err => (res.headersSent ? res.end() : sendError(res, err)))
    } else if (staticDir) {
      serveStatic(staticDir, url, res)
    } else {
      sendJson(res, 404, { error: { code: 'bad-request', message: 'Not found' } })
    }
  })
}

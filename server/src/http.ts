import http from 'node:http'
import {
  DEFAULT_PORTS, LIVE_CAPABILITIES, QUICK_LOGIN_BRANDS, commandBrandOf, previewBrandOf, mergeCommands, templateKeyFor, TEMPLATE_KEYS, TEMPLATE_PROTOCOLS, UDP_PROTOCOLS, effectiveCapabilities, isDriverProtocol,
  type ApiErrorCode, type CommandDto, type CommandOverridesDto, type CommandTemplates, type DriverProtocol, type HealthDto, type QuickLoginsDto, type TargetDto,
} from '../../shared/api.ts'
import { DRIVERS } from './drivers/index.ts'
import { christiePreview } from './drivers/christieWeb.ts'
import { panasonicPreview } from './drivers/panasonicWeb.ts'
import type { DriverTarget } from './drivers/types.ts'
import { DeviceError } from './net/tcp.ts'
import type { AccountManager } from './account.ts'
import type { LicenseManager } from './license.ts'
import { addReadings } from './readings.ts'
import { identifyDevice } from './identify.ts'
import { pingDevice } from './ping.ts'
import { fsStatic, type StaticSource } from './static.ts'
import { checkScanRange } from '../../shared/ipRange.ts'
import { scanRange, SCAN_PROTOCOLS } from './scan.ts'
import { isValidProjectId, validateSnapshot, type ProjectStore } from './store.ts'
import { extractToken, isAllowedHost, isLocalHostHeader, isValidSubnetPrefix, tokenMatches } from './security.ts'

const MAX_BODY = 64 * 1024
const MAX_PROJECT_BODY = 2 * 1024 * 1024
const DEFAULT_TIMEOUT_MS = 3000

const STATUS: Record<ApiErrorCode, number> = {
  'bad-request': 400, 'forbidden-host': 403, unsupported: 501,
  unauthorized: 401, 'not-found': 404, license: 402, connect: 502, timeout: 504, auth: 502, protocol: 502, device: 502,
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

function parseTarget(raw: unknown, overrides?: CommandOverridesDto): { protocol: DriverProtocol; target: DriverTarget } {
  if (!isObject(raw) || typeof raw.ip !== 'string' || !isObject(raw.protocol)) throw new DeviceError('bad-request', 'Missing target.ip / target.protocol')
  const t = raw as unknown as TargetDto
  if (!isAllowedHost(t.ip)) throw new DeviceError('forbidden-host', `${t.ip} is not a private/loopback IPv4 address`)
  if (!isDriverProtocol(t.protocol.type)) throw new DeviceError('unsupported', `No live driver for protocol "${t.protocol.type}"`)
  const protocol = t.protocol.type
  const port = t.protocol.port ?? DEFAULT_PORTS[protocol]
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new DeviceError('bad-request', 'Invalid port')
  return { protocol, target: { host: t.ip, port, username: t.protocol.username, password: t.protocol.password, timeoutMs: DEFAULT_TIMEOUT_MS, commands: mergeCommands(commandBrandOf(protocol) ? overrides?.[commandBrandOf(protocol)!] : undefined, parseTemplates(t.protocol.commands)) } }
}

function parseTemplates(raw: unknown): CommandTemplates | undefined {
  if (!isObject(raw)) return undefined
  const out: CommandTemplates = {}
  for (const key of TEMPLATE_KEYS) {
    const v = raw[key]
    if (typeof v === 'string' && v.trim() && v.length <= 256) out[key] = v
  }
  return out
}

/** Ghi kết quả live preview ra terminal gateway khi nó đổi (không ghi tài khoản), để dò lỗi với máy thật. */
const lastPreviewLog = new Map<string, string>()
function logPreview(host: string, line: string): void {
  if (lastPreviewLog.get(host) === line) return
  lastPreviewLog.set(host, line)
  console.log(`[preview ${host}] ${line}`)
}

function requireCapability(protocol: DriverProtocol, cap: 'raw' | 'preview' | CommandDto['kind'], target: DriverTarget): void {
  if (!effectiveCapabilities(protocol, target.commands).includes(cap)) throw new DeviceError('unsupported', `${protocol} does not support "${cap}"${TEMPLATE_PROTOCOLS.includes(protocol) ? ' (no command template configured)' : ''}`)
}

async function handleApi(req: http.IncomingMessage, res: http.ServerResponse, url: URL, token?: string, store?: ProjectStore, onQuit?: () => void, license?: LicenseManager, account?: AccountManager): Promise<void> {
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

  // Tài khoản (Supabase). Mật khẩu chỉ đi qua đây tới máy chủ tài khoản, không lưu, không ghi log.
  const accountRoute = /^\/api\/account(?:\/(signup|login|logout|refresh))?$/.exec(url.pathname)
  if (accountRoute) {
    if (!account?.configured || !license) throw new DeviceError('unsupported', 'Accounts are not configured on this gateway')
    const action = accountRoute[1]
    if (!action && req.method === 'GET') return sendJson(res, 200, { license: license.status() })
    if (req.method !== 'POST') throw new DeviceError('bad-request', `Unknown route ${route}`)
    if (action === 'logout') { account.signOut(); return sendJson(res, 200, { license: license.status() }) }
    if (action === 'refresh') { await license.checkNow(); return sendJson(res, 200, { license: license.status() }) }
    const body = await readJson(req)
    const email = isObject(body) && typeof body.email === 'string' ? body.email.trim() : ''
    const password = isObject(body) && typeof body.password === 'string' ? body.password : ''
    if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email) || email.length > 254) throw new DeviceError('bad-request', 'Enter a valid email address')
    if (password.length < 6 || password.length > 128) throw new DeviceError('bad-request', 'The password must be 6–128 characters')
    if (action === 'signup') {
      const signedIn = await account.signUp(email, password)
      return sendJson(res, 200, { confirmEmail: !signedIn, license: license.status() })
    }
    await account.signIn(email, password)
    return sendJson(res, 200, { license: license.status() })
  }

  if (route === 'POST /api/license/check') {
    if (!license) throw new DeviceError('unsupported', 'Licensing is not enabled on this gateway')
    return sendJson(res, 200, await license.checkNow())
  }

  if (url.pathname === '/api/license') {
    if (!license) throw new DeviceError('unsupported', 'Licensing is not enabled on this gateway')
    if (req.method === 'GET') return sendJson(res, 200, license.status())
    if (req.method === 'DELETE') return sendJson(res, 200, license.remove())
    if (req.method === 'PUT') {
      const body = await readJson(req)
      if (!isObject(body) || typeof body.key !== 'string' || body.key.length > 2048) throw new DeviceError('bad-request', 'Missing license key')
      return sendJson(res, 200, license.install(body.key))
    }
  }

  if (url.pathname === '/api/command-overrides') {
    if (!store) throw new DeviceError('unsupported', 'Storage is not enabled on this gateway')
    if (req.method === 'GET') return sendJson(res, 200, store.getCommandOverrides())
    if (req.method === 'PUT') {
      const body = await readJson(req)
      if (!isObject(body)) throw new DeviceError('bad-request', 'Body must be an object')
      store.setCommandOverrides(body as CommandOverridesDto)
      return sendJson(res, 200, store.getCommandOverrides())
    }
  }

  if (url.pathname === '/api/quick-logins') {
    if (!store) throw new DeviceError('unsupported', 'Storage is not enabled on this gateway')
    if (req.method === 'GET') return sendJson(res, 200, store.getQuickLogins())
    if (req.method === 'PUT') {
      const body = await readJson(req)
      if (!isObject(body)) throw new DeviceError('bad-request', 'Body must be an object')
      const logins: QuickLoginsDto = {}
      for (const brand of QUICK_LOGIN_BRANDS) {
        const e = body[brand]
        if (e === undefined || e === null) continue
        if (!isObject(e) || typeof e.username !== 'string' || typeof e.password !== 'string' || e.username.length > 128 || e.password.length > 256) {
          throw new DeviceError('bad-request', `Invalid quick login for ${brand}`)
        }
        logins[brand] = { username: e.username, password: e.password }
      }
      store.setQuickLogins(logins)
      return sendJson(res, 200, { ok: true })
    }
  }

  // Tắt MikMaster từ giao diện (bản đóng gói chạy nền, không có cửa sổ để đóng).
  if (route === 'POST /api/app/quit') {
    if (!onQuit) throw new DeviceError('unsupported', 'This gateway cannot be stopped from the web app')
    sendJson(res, 200, { ok: true })
    setTimeout(onQuit, 100) // trả lời xong rồi mới tắt
    return
  }

  if (route === 'POST /api/devices/ping') {
    // Không cần driver: ping được mọi giao thức, kể cả loại chưa có lệnh điều khiển.
    const body = await readJson(req)
    const t = isObject(body) && isObject(body.target) ? body.target : null
    if (!t || typeof t.ip !== 'string' || !isObject(t.protocol)) throw new DeviceError('bad-request', 'Missing target.ip / target.protocol')
    if (!isAllowedHost(t.ip)) throw new DeviceError('forbidden-host', `${t.ip} is not a private/loopback IPv4 address`)
    const port = Number(t.protocol.port)
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new DeviceError('bad-request', 'Invalid port')
    return sendJson(res, 200, await pingDevice(t.ip, port, UDP_PROTOCOLS.includes(String(t.protocol.type))))
  }

  if (route === 'POST /api/devices/identify') {
    const body = await readJson(req)
    if (!isObject(body) || typeof body.ip !== 'string') throw new DeviceError('bad-request', 'Missing ip')
    if (!isAllowedHost(body.ip)) throw new DeviceError('forbidden-host', `${body.ip} is not a private/loopback IPv4 address`)
    const creds = { username: typeof body.username === 'string' ? body.username : undefined, password: typeof body.password === 'string' ? body.password : undefined }
    return sendJson(res, 200, await identifyDevice(body.ip, creds))
  }

  if (route === 'GET /api/scan') {
    // ?from=a.b.c.d&to=a.b.c.d (dải tuỳ chọn) hoặc ?subnet=a.b.c (= .1 – .254, cách gọi cũ).
    const subnet = url.searchParams.get('subnet')
    if (subnet !== null && !isValidSubnetPrefix(subnet)) throw new DeviceError('bad-request', 'subnet must be a private "a.b.c" prefix')
    const range = subnet !== null
      ? checkScanRange(`${subnet}.1`, `${subnet}.254`)
      : checkScanRange(url.searchParams.get('from') ?? '', url.searchParams.get('to') ?? '')
    if (!range.ok) throw new DeviceError('bad-request', range.error)
    const abort = new AbortController()
    res.on('close', () => abort.abort())
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
    const emit = (event: string, data: unknown) => { if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`) }
    await scanRange({
      from: range.from, to: range.to, protocols: SCAN_PROTOCOLS, signal: abort.signal,
      onProgress: (pct, ip) => emit('progress', { pct, ip }),
      onFound: found => emit('found', found),
    })
    emit('done', {})
    res.end()
    return
  }

  if (route === 'POST /api/devices/preview') {
    const body = await readJson(req)
    if (!isObject(body)) throw new DeviceError('bad-request', 'Body must be an object')
    const { protocol, target } = parseTarget(body.target, store?.getCommandOverrides())
    // Hãng: theo giao thức riêng của hãng; PJLink chỉ biết qua gợi ý `brand` của giao diện (đọc từ model).
    const hint = isObject(body.target) && body.target.brand === 'panasonic' ? 'panasonic' : undefined
    const brand = previewBrandOf(protocol, hint === 'panasonic' ? 'Panasonic' : undefined)
    if (!brand) throw new DeviceError('unsupported', `${protocol} has no live preview`)
    license?.requirePro('Live preview')
    license?.check(target.host, 'status')
    try {
      const preview = brand === 'christie' ? await christiePreview(target) : await panasonicPreview(target, undefined, { preshow: typeof body.preshow === 'boolean' ? body.preshow : undefined })
      logPreview(target.host, `ok: ${preview.state}${preview.input ? ` (${preview.input})` : ''}`)
      return sendJson(res, 200, preview)
    } catch (err) {
      logPreview(target.host, `failed: ${err instanceof DeviceError ? `${err.code} — ${err.message}` : String(err)}`)
      throw err
    }
  }

  if (req.method === 'POST' && ['/api/devices/status', '/api/devices/command', '/api/devices/raw'].includes(url.pathname)) {
    const body = await readJson(req)
    if (!isObject(body)) throw new DeviceError('bad-request', 'Body must be an object')
    const { protocol, target } = parseTarget(body.target, store?.getCommandOverrides())
    const driver = DRIVERS[protocol]

    license?.check(target.host, url.pathname === '/api/devices/status' ? 'status' : 'control')
    if (url.pathname === '/api/devices/status') return sendJson(res, 200, await addReadings(driver, target, await driver.status(target)))

    if (url.pathname === '/api/devices/command') {
      if (!isObject(body.command) || typeof body.command.kind !== 'string') throw new DeviceError('bad-request', 'Missing command.kind')
      const command = body.command as unknown as CommandDto
      requireCapability(protocol, command.kind, target)
      // Bản Free chỉ bật / tắt máy và shutter; mọi thay đổi khác (input, OSD, test pattern, lens…) là Pro.
      if (command.kind !== 'power' && command.kind !== 'shutter') license?.requirePro(`Changing ${command.kind}`)
      const templates = target.commands
      if (command.kind === 'testPattern' && templates?.testPatternOn && templates.testPatternOff) {
        // Người dùng đã khai báo lệnh test pattern của riêng mình: gửi đúng lệnh đó qua đường RAW của driver.
        await driver.raw(target, templates[command.enabled ? 'testPatternOn' : 'testPatternOff']!.trim())
      } else {
        // Lệnh sửa ở trang Nâng cao (hoặc riêng từng máy) thay cho lệnh có sẵn của driver hãng: gửi nguyên văn qua đường RAW.
        const key = templateKeyFor(command)
        const custom = !TEMPLATE_PROTOCOLS.includes(protocol) && key && command.kind !== 'testPattern' ? templates?.[key]?.trim() : undefined
        if (custom) await driver.raw(target, custom)
        else await driver.command(target, command)
      }
      return sendJson(res, 200, { ok: true })
    }

    if (typeof body.text !== 'string' || body.text.length === 0 || body.text.length > 256) throw new DeviceError('bad-request', 'text must be 1–256 characters')
    requireCapability(protocol, 'raw', target)
    license?.requirePro('RAW COMMAND')
    return sendJson(res, 200, { reply: await driver.raw(target, body.text) })
  }

  throw new DeviceError('bad-request', `Unknown route ${route}`)
}

function serveStatic(source: StaticSource, url: URL, res: http.ServerResponse): void {
  const file = source(url.pathname)
  if (!file) return sendJson(res, 404, { error: { code: 'bad-request', message: 'Not found' } })
  res.writeHead(200, { 'Content-Type': file.type, 'Content-Length': file.body.length })
  res.end(file.body)
}

export function createServer(options: { staticDir?: string; staticSource?: StaticSource; token?: string; store?: ProjectStore; license?: LicenseManager; account?: AccountManager; onQuit?: () => void } = {}): http.Server {
  const staticSource = options.staticSource ?? (options.staticDir ? fsStatic(options.staticDir) : undefined)
  return http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname.startsWith('/api/')) {
      // Có token thì token đã bảo vệ (truy cập từ máy khác trong LAN); không token thì chỉ nhận tên máy cục bộ.
      if (options.token === undefined && !isLocalHostHeader(req.headers.host)) {
        return sendJson(res, 403, { error: { code: 'forbidden-host', message: 'Requests must be addressed to localhost' } })
      }
      handleApi(req, res, url, options.token, options.store, options.onQuit, options.license, options.account).catch(err => (res.headersSent ? res.end() : sendError(res, err)))
    } else if (staticSource) {
      serveStatic(staticSource, url, res)
    } else {
      sendJson(res, 404, { error: { code: 'bad-request', message: 'Not found' } })
    }
  })
}

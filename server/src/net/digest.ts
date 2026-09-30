import crypto from 'node:crypto'
import http from 'node:http'
import { DeviceError } from './tcp.ts'

/*
 * HTTP Digest (RFC 7616 / 2617) cho trang web của máy chiếu (Panasonic: realm "WEB Zone"). Không dùng thư viện.
 *
 * Bảo vệ máy chiếu: nếu tài khoản bị từ chối, KHÔNG thử lại cùng tài khoản trong BLOCK_MS (nhiều máy khoá đăng nhập web sau vài lần sai).
 * Đổi tài khoản / mật khẩu thì thử lại được ngay.
 */
const BLOCK_MS = 5 * 60_000
const MAX_BODY = 4 * 1024 * 1024

export interface Challenge { realm: string; nonce: string; qop?: string; opaque?: string; algorithm: 'MD5' | 'SHA-256' }

export function parseChallenge(header: string): Challenge | null {
  const m = /^\s*Digest\s+(.*)$/is.exec(header)
  if (!m) return null
  const f: Record<string, string> = {}
  for (const x of m[1]!.matchAll(/([a-z0-9-]+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^\s,]*))/gi)) f[x[1]!.toLowerCase()] = x[2] ?? x[3] ?? ''
  if (!f.realm || !f.nonce) return null
  const algo = (f.algorithm ?? 'MD5').toUpperCase()
  if (algo !== 'MD5' && algo !== 'SHA-256') return null
  const qop = f.qop?.split(',').map(s => s.trim()).find(s => s === 'auth')
  return { realm: f.realm, nonce: f.nonce, ...(qop ? { qop } : {}), ...(f.opaque ? { opaque: f.opaque } : {}), algorithm: algo }
}

const hash = (algo: Challenge['algorithm'], s: string) => crypto.createHash(algo === 'SHA-256' ? 'sha256' : 'md5').update(s).digest('hex')

/** Giá trị `response` của Digest (ví dụ chuẩn RFC 2617 dùng trong test). */
export function digestResponse(c: Challenge, o: { username: string; password: string; method: string; uri: string; nc: string; cnonce: string }): string {
  const ha1 = hash(c.algorithm, `${o.username}:${c.realm}:${o.password}`)
  const ha2 = hash(c.algorithm, `${o.method}:${o.uri}`)
  return c.qop ? hash(c.algorithm, `${ha1}:${c.nonce}:${o.nc}:${o.cnonce}:${c.qop}:${ha2}`) : hash(c.algorithm, `${ha1}:${c.nonce}:${ha2}`)
}

function authorization(c: Challenge, o: { username: string; password: string; method: string; uri: string }, nc: number): string {
  const ncHex = nc.toString(16).padStart(8, '0')
  const cnonce = crypto.randomBytes(8).toString('hex')
  const response = digestResponse(c, { ...o, nc: ncHex, cnonce })
  const q = (v: string) => `"${v.replace(/["\\]/g, '\\$&')}"`
  return `Digest username=${q(o.username)}, realm=${q(c.realm)}, nonce=${q(c.nonce)}, uri=${q(o.uri)}, algorithm=${c.algorithm}, response=${q(response)}`
    + (c.qop ? `, qop=${c.qop}, nc=${ncHex}, cnonce=${q(cnonce)}` : '') + (c.opaque ? `, opaque=${q(c.opaque)}` : '')
}

interface Raw { status: number; headers: http.IncomingHttpHeaders; body: Buffer }

function raw(host: string, port: number, method: string, uri: string, headers: Record<string, string>, timeoutMs: number): Promise<Raw> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host, port, method, path: uri, headers, timeout: timeoutMs, agent: false }, res => {
      const chunks: Buffer[] = []
      let size = 0
      res.on('data', (c: Buffer) => { size += c.length; if (size > MAX_BODY) req.destroy(new DeviceError('protocol', 'Answer too large')); else chunks.push(c) })
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }))
    })
    req.on('timeout', () => req.destroy(new DeviceError('timeout', `${host}:${port} did not answer within ${timeoutMs}ms`)))
    req.on('error', err => reject(err instanceof DeviceError ? err : new DeviceError('connect', `Cannot reach ${host}:${port} (${err.message})`)))
    req.end()
  })
}

const challenges = new Map<string, { c: Challenge; nc: number }>()
const blockedUntil = new Map<string, number>()

/** GET có Digest. Tái dùng nonce của lần trước (ít vòng hơn); 401 → lấy challenge mới và thử đúng MỘT lần. */
export async function digestGet(opts: { host: string; port: number; uri: string; username: string; password: string; timeoutMs: number; now?: () => number }): Promise<Raw> {
  const now = opts.now ?? Date.now
  const id = `${opts.host}:${opts.port}|${opts.username}|${crypto.createHash('sha1').update(opts.password).digest('hex').slice(0, 10)}`
  const until = blockedUntil.get(id) ?? 0
  if (until > now()) {
    throw new DeviceError('auth', `The projector web refused this login — not retrying for ${Math.ceil((until - now()) / 60_000)} min so the projector does not lock the account. Change the account to try again.`)
  }
  const send = (c: Challenge, n: number) => raw(opts.host, opts.port, 'GET', opts.uri, { Authorization: authorization(c, { username: opts.username, password: opts.password, method: 'GET', uri: opts.uri }, n) }, opts.timeoutMs)

  const cached = challenges.get(id)
  if (cached) {
    cached.nc++
    const r = await send(cached.c, cached.nc)
    if (r.status !== 401) return r
    challenges.delete(id) // nonce hết hạn → xin challenge mới bên dưới
  }
  const first = await raw(opts.host, opts.port, 'GET', opts.uri, {}, opts.timeoutMs)
  if (first.status !== 401) return first
  const c = parseChallenge(String(first.headers['www-authenticate'] ?? ''))
  if (!c) throw new DeviceError('protocol', 'The projector web asked for a login this gateway does not support')
  const r = await send(c, 1)
  if (r.status === 401) {
    blockedUntil.set(id, now() + BLOCK_MS)
    throw new DeviceError('auth', 'The projector web refused the login (wrong user name or password)')
  }
  challenges.set(id, { c, nc: 1 })
  return r
}

/** Chỉ để test. */
export function resetDigestState(): void { challenges.clear(); blockedUntil.clear() }

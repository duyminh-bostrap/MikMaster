import http from 'node:http'
import type { PreviewDto } from '../../../shared/api.ts'
import { DeviceError } from '../net/tcp.ts'
import type { DriverTarget } from './types.ts'

/*
 * Live preview của Christie Griffyn qua web của máy (cổng 80), rút ra từ giao diện web chính thức của máy
 * (compiled.js, firmware griffyn 1.3.7):
 *
 *   POST /cgi-bin/c4jweb/          {"jsonrpc":"2.0","method":"session:connect","params":{"user":…,"pass":…}}
 *                                  → result = khoá phiên, vd. "/cgi-bin/c4jweb?SessionId=…"
 *   POST <khoá phiên>              {"method":"video:getInputInfo","params":[]}
 *                                  → [{ idx, name, imageType, path, res, vFreq, active, … }]
 *   GET  <khoá phiên thay c4jweb bằng thumbnail>&filename=/<path>.png&<thời điểm>  → ảnh PNG
 *
 * imageType: 0 Thumbnail · 1 Preview · 2 NoThumbnail · 3 NoSignal. Lỗi 116 = phiên hết hạn → đăng nhập lại.
 * Không đăng nhập thì máy trả "Invalid Parameter" / "invalid Session ID": bắt buộc có tài khoản web.
 */
const WEB_PORT = 80
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const SESSION_EXPIRED = 116

interface Thumb { name?: string; imageType?: number; path?: string; res?: string; active?: boolean }

const sessions = new Map<string, string>()

function request(host: string, port: number, method: 'GET' | 'POST', path: string, body: string | undefined, timeoutMs: number): Promise<{ status: number; type: string; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host, port, method, path, timeout: timeoutMs, headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {} }, res => {
      const chunks: Buffer[] = []
      let size = 0
      res.on('data', (c: Buffer) => {
        size += c.length
        if (size > MAX_IMAGE_BYTES) { req.destroy(new DeviceError('protocol', 'Preview image too large')); return }
        chunks.push(c)
      })
      res.on('end', () => resolve({ status: res.statusCode ?? 0, type: String(res.headers['content-type'] ?? ''), body: Buffer.concat(chunks) }))
    })
    req.on('timeout', () => req.destroy(new DeviceError('timeout', `Web of ${host} did not answer within ${timeoutMs}ms`)))
    req.on('error', err => reject(err instanceof DeviceError ? err : new DeviceError('connect', `Cannot reach the projector web at ${host}:${port} (${err.message})`)))
    if (body) req.write(body)
    req.end()
  })
}

class RpcError extends Error {
  readonly code: number
  constructor(code: number, message: string) { super(message); this.code = code }
}

let rpcId = 0
async function rpc(host: string, port: number, path: string, method: string, params: unknown, timeoutMs: number): Promise<unknown> {
  const res = await request(host, port, 'POST', path, JSON.stringify({ jsonrpc: '2.0', method, id: ++rpcId, params }), timeoutMs)
  if (res.status < 200 || res.status >= 300) throw new DeviceError('protocol', `Projector web answered HTTP ${res.status}`)
  let reply: { result?: unknown; error?: { code?: number; message?: string } }
  try { reply = JSON.parse(res.body.toString('utf8')) } catch { throw new DeviceError('protocol', 'Projector web did not answer JSON-RPC') }
  if (reply.error) throw new RpcError(Number(reply.error.code), String(reply.error.message ?? 'error'))
  return reply.result
}

/** Khoá phiên: đường dẫn nội bộ của máy (vd. "/cgi-bin/c4jweb?SessionId=…"); chỉ nhận đường dẫn tương đối dưới /cgi-bin/c4jweb. */
function isSessionPath(v: unknown): v is string {
  return typeof v === 'string' && v.length < 200 && /^\/cgi-bin\/c4jweb\/?\?[\w=&.-]+$/.test(v)
}

async function connect(t: DriverTarget, port: number): Promise<string> {
  if (!t.username && !t.password) throw new DeviceError('auth', 'Enter the projector web account (top right) to see the live preview')
  try {
    const token = await rpc(t.host, port, '/cgi-bin/c4jweb/', 'session:connect', { user: t.username ?? '', pass: t.password ?? '' }, t.timeoutMs)
    if (!isSessionPath(token)) throw new DeviceError('protocol', 'Unexpected session answer from the projector web')
    return token
  } catch (err) {
    if (err instanceof RpcError) throw new DeviceError('auth', `Projector web refused the login (${err.message})`)
    throw err
  }
}

async function inputInfo(t: DriverTarget, port: number, key: string): Promise<{ token: string; thumbs: Thumb[] }> {
  for (let attempt = 0; ; attempt++) {
    let token = sessions.get(key)
    if (!token) { token = await connect(t, port); sessions.set(key, token) }
    try {
      const result = await rpc(t.host, port, token, 'video:getInputInfo', [], t.timeoutMs)
      return { token, thumbs: Array.isArray(result) ? result as Thumb[] : [] }
    } catch (err) {
      sessions.delete(key)
      if (err instanceof RpcError && err.code === SESSION_EXPIRED && attempt === 0) continue
      if (err instanceof RpcError) throw new DeviceError('device', `Projector web: ${err.message}`)
      throw err
    }
  }
}

export async function christiePreview(t: DriverTarget, port = WEB_PORT): Promise<PreviewDto> {
  const key = `${t.host}:${port}:${t.username ?? ''}:${t.password ?? ''}`
  const { token, thumbs } = await inputInfo(t, port, key)
  const active = thumbs.find(x => x.active) ?? null
  if (!active) return { state: 'no-signal' }
  const info = { input: active.name, resolution: active.res }
  if (active.imageType === 3) return { state: 'no-signal', ...info }
  if (active.imageType === 2 || !active.path || !/^[\w/.-]+$/.test(active.path)) return { state: 'no-thumbnail', ...info }
  const url = `${token.replace('c4jweb', 'thumbnail')}&filename=/${active.path}.png&${Date.now()}`
  const img = await request(t.host, port, 'GET', url, undefined, t.timeoutMs)
  if (img.status !== 200 || img.body.length === 0) throw new DeviceError('device', `Preview image not available (HTTP ${img.status})`)
  const type = img.type.startsWith('image/') ? img.type.split(';')[0] : 'image/png'
  return { state: 'image', image: `data:${type};base64,${img.body.toString('base64')}`, ...info }
}

/** Chỉ để test. */
export function resetChristieSessions(): void { sessions.clear() }

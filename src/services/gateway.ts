import type { ApiErrorCode, CommandDto, HealthDto, ScanFoundDto, StatusDto, TargetDto } from '../../shared/api.ts'
import type { Projector } from '@/types'

export type GatewayResult<T> = { ok: true; value: T } | { ok: false; code: ApiErrorCode | 'network'; message: string }

export interface ScanHandlers {
  onProgress: (pct: number, ip: string) => void
  onFound: (found: ScanFoundDto) => void
  onDone: () => void
  onError: (message: string) => void
}

/** Cầu nối tới server/ (nơi thật sự nói chuyện TCP với máy chiếu). */
export interface Gateway {
  status(p: Projector): Promise<GatewayResult<StatusDto>>
  command(p: Projector, command: CommandDto): Promise<GatewayResult<null>>
  raw(p: Projector, text: string): Promise<GatewayResult<string>>
  /** Trả về hàm huỷ. */
  scan(subnet: string, handlers: ScanHandlers): () => void
}

export function toTarget(p: Projector): TargetDto {
  const { type, port, username, password } = p.network.protocol
  return { ip: p.network.ip, protocol: { type, port, username, password } }
}

const TOKEN_KEY = 'mikmaster.gatewayToken'

/** Token lấy từ `?token=` (rồi xoá khỏi URL) hoặc localStorage. */
export function loadToken(): string | null {
  try {
    const url = new URL(window.location.href)
    const fromUrl = url.searchParams.get('token')
    if (fromUrl) {
      localStorage.setItem(TOKEN_KEY, fromUrl)
      url.searchParams.delete('token')
      window.history.replaceState(null, '', url.toString())
      return fromUrl
    }
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

async function call<T>(base: string, token: string | null, path: string, body: unknown): Promise<GatewayResult<T>> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) })
    const json = await res.json().catch(() => null)
    if (res.ok) return { ok: true, value: json as T }
    const err = json?.error
    return { ok: false, code: err?.code ?? 'network', message: err?.message ?? `Gateway error (${res.status})` }
  } catch {
    return { ok: false, code: 'network', message: 'Gateway is not reachable' }
  }
}

export function createHttpGateway(base = '', token: string | null = null): Gateway {
  return {
    status: p => call<StatusDto>(base, token, '/api/devices/status', { target: toTarget(p) }),
    command: async (p, command) => {
      const r = await call<{ ok: true }>(base, token, '/api/devices/command', { target: toTarget(p), command })
      return r.ok ? { ok: true, value: null } : r
    },
    raw: async (p, text) => {
      const r = await call<{ reply: string }>(base, token, '/api/devices/raw', { target: toTarget(p), text })
      return r.ok ? { ok: true, value: r.value.reply } : r
    },
    scan(subnet, h) {
      const source = new EventSource(`${base}/api/scan?subnet=${encodeURIComponent(subnet)}${token ? `&token=${encodeURIComponent(token)}` : ''}`)
      let finished = false
      const finish = () => { finished = true; source.close() }
      source.addEventListener('progress', e => { const d = JSON.parse((e as MessageEvent).data); h.onProgress(d.pct, d.ip) })
      source.addEventListener('found', e => h.onFound(JSON.parse((e as MessageEvent).data)))
      source.addEventListener('done', () => { finish(); h.onDone() })
      // EventSource tự nối lại khi rớt; báo lỗi và dừng hẳn để không quét lặp.
      source.onerror = () => { if (!finished) { finish(); h.onError('Lost connection to the gateway during scan') } }
      return finish
    },
  }
}

/** Trả `null` nếu không có gateway (chưa chạy `pnpm server`) → app dùng chế độ mô phỏng. */
export async function detectGateway(base = ''): Promise<Gateway | null> {
  try {
    const token = loadToken()
    const res = await fetch(`${base}/api/health`, {
      signal: AbortSignal.timeout(1500),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const json = (await res.json()) as Partial<HealthDto>
    if (!res.ok || json.ok !== true) return null
    // Gateway đòi token mà ta không có/sai → coi như không dùng được (SIMULATED).
    if (json.authRequired && !json.authorized) return null
    return createHttpGateway(base, token)
  } catch {
    return null
  }
}

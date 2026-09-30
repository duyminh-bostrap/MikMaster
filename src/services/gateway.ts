import type { ApiErrorCode, CommandDto, CommandOverridesDto, HealthDto, IdentifyDto, LicenseStatusDto, PingDto, PreviewDto, ProjectSnapshotDto, ProjectSummaryDto, QuickLoginsDto, ScanFoundDto, StatusDto, TargetDto } from '../../shared/api.ts'
import type { Projector } from '@/types'

export type GatewayResult<T> = { ok: true; value: T } | { ok: false; code: ApiErrorCode | 'network'; message: string }

export interface AccountResult { license: LicenseStatusDto; /** Đăng ký xong nhưng cần xác nhận email trước khi đăng nhập. */ confirmEmail?: boolean }

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
  /** Ảnh tín hiệu vào hiện tại (Christie: qua web của máy, cần tài khoản web). */
  preview(p: Projector): Promise<GatewayResult<PreviewDto>>
  /** Tài khoản đăng nhập nhanh theo hãng (lưu mã hoá ở gateway). */
  getQuickLogins(): Promise<GatewayResult<QuickLoginsDto>>
  saveQuickLogins(logins: QuickLoginsDto): Promise<GatewayResult<unknown>>
  /** Tài khoản (Supabase, qua gateway). Kết quả luôn kèm trạng thái bản quyền mới. */
  accountSignIn(email: string, password: string): Promise<GatewayResult<AccountResult>>
  accountSignUp(email: string, password: string): Promise<GatewayResult<AccountResult>>
  accountSignOut(): Promise<GatewayResult<AccountResult>>
  /** Lệnh sửa ở trang Nâng cao, theo hãng (lưu ở gateway). */
  getCommandOverrides(): Promise<GatewayResult<CommandOverridesDto>>
  saveCommandOverrides(o: CommandOverridesDto): Promise<GatewayResult<CommandOverridesDto>>
  /** Bản quyền phần mềm. */
  getLicense(): Promise<GatewayResult<LicenseStatusDto>>
  installLicense(key: string): Promise<GatewayResult<LicenseStatusDto>>
  removeLicense(): Promise<GatewayResult<LicenseStatusDto>>
  /** Kiểm tra bản quyền qua mạng ngay (tải file trạng thái đã ký). */
  checkLicenseOnline(): Promise<GatewayResult<LicenseStatusDto>>
  /** Tắt gateway (và MikMaster). */
  quit(): Promise<GatewayResult<unknown>>
  /** Nhận diện máy ở một IP: giao thức, cổng, hãng, model. */
  identify(ip: string, creds?: { username?: string; password?: string }): Promise<GatewayResult<IdentifyDto>>
  /** ICMP ping + thử mở cổng điều khiển TCP. */
  ping(p: Projector): Promise<GatewayResult<PingDto>>
  listProjects(): Promise<GatewayResult<ProjectSummaryDto[]>>
  loadProject(id: string): Promise<GatewayResult<ProjectSnapshotDto>>
  saveProject(snapshot: ProjectSnapshotDto): Promise<GatewayResult<ProjectSummaryDto>>
  deleteProject(id: string): Promise<GatewayResult<unknown>>
  /** Trả về hàm huỷ. */
  scan(range: { from: string; to: string }, handlers: ScanHandlers): () => void
}

export function toTarget(p: Projector): TargetDto {
  const { type, port, username, password, commands } = p.network.protocol
  return { ip: p.network.ip, protocol: { type, port, username, password, commands } }
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

async function call<T>(base: string, token: string | null, path: string, body?: unknown, method = 'POST'): Promise<GatewayResult<T>> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    const json = await res.json().catch(() => null)
    // 200 nhưng thân không phải JSON (bị proxy / trang khác che): coi là lỗi, không đưa `null` vào giao diện.
    if (res.ok) return json === null ? { ok: false, code: 'network', message: 'Unexpected answer from the gateway' } : { ok: true, value: json as T }
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
    preview: p => call<PreviewDto>(base, token, '/api/devices/preview', { target: toTarget(p) }),
    getQuickLogins: () => call<QuickLoginsDto>(base, token, '/api/quick-logins', undefined, 'GET'),
    saveQuickLogins: logins => call<unknown>(base, token, '/api/quick-logins', logins, 'PUT'),
    accountSignIn: (email, password) => call<AccountResult>(base, token, '/api/account/login', { email, password }),
    accountSignUp: (email, password) => call<AccountResult>(base, token, '/api/account/signup', { email, password }),
    accountSignOut: () => call<AccountResult>(base, token, '/api/account/logout', {}),
    getCommandOverrides: () => call<CommandOverridesDto>(base, token, '/api/command-overrides', undefined, 'GET'),
    saveCommandOverrides: o => call<CommandOverridesDto>(base, token, '/api/command-overrides', o, 'PUT'),
    getLicense: () => call<LicenseStatusDto>(base, token, '/api/license', undefined, 'GET'),
    installLicense: key => call<LicenseStatusDto>(base, token, '/api/license', { key }, 'PUT'),
    removeLicense: () => call<LicenseStatusDto>(base, token, '/api/license', undefined, 'DELETE'),
    checkLicenseOnline: () => call<LicenseStatusDto>(base, token, '/api/license/check', {}),
    quit: () => call<unknown>(base, token, '/api/app/quit', {}),
    identify: (ip, creds) => call<IdentifyDto>(base, token, '/api/devices/identify', { ip, ...creds }),
    ping: p => call<PingDto>(base, token, '/api/devices/ping', { target: toTarget(p) }),
    listProjects: () => call<ProjectSummaryDto[]>(base, token, '/api/projects', undefined, 'GET'),
    loadProject: id => call<ProjectSnapshotDto>(base, token, `/api/projects/${encodeURIComponent(id)}`, undefined, 'GET'),
    saveProject: snapshot => call<ProjectSummaryDto>(base, token, `/api/projects/${encodeURIComponent(snapshot.project.id)}`, snapshot, 'PUT'),
    deleteProject: id => call<unknown>(base, token, `/api/projects/${encodeURIComponent(id)}`, undefined, 'DELETE'),
    scan(range, h) {
      const q = new URLSearchParams({ from: range.from, to: range.to, ...(token ? { token } : {}) })
      const source = new EventSource(`${base}/api/scan?${q}`)
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

export function saveToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* bộ nhớ trình duyệt bị chặn → token chỉ dùng trong lần này */ }
}

export type Detection =
  | { kind: 'live'; gateway: Gateway }
  | { kind: 'none' }
  /** Có gateway nhưng thiếu / sai token. */
  | { kind: 'locked'; hadToken: boolean }

/** `none` nếu không có gateway (chưa chạy `pnpm run server`) → app dùng chế độ mô phỏng. */
export async function detectGateway(base = '', explicitToken?: string): Promise<Detection> {
  try {
    const token = explicitToken ?? loadToken()
    const res = await fetch(`${base}/api/health`, {
      signal: AbortSignal.timeout(1500),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const json = (await res.json()) as Partial<HealthDto>
    if (!res.ok || json.ok !== true) return { kind: 'none' }
    if (json.authRequired && !json.authorized) return { kind: 'locked', hadToken: !!token }
    return { kind: 'live', gateway: createHttpGateway(base, token) }
  } catch {
    return { kind: 'none' }
  }
}

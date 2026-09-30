import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { AccountStatusDto, EntitlementKind } from '../../shared/api.ts'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './licenseKey.ts'
import { DeviceError } from './net/tcp.ts'

/*
 * Tài khoản MikMaster trên Supabase (Auth + Postgres), gọi thẳng REST — không cần thư viện.
 *   Đăng ký / đăng nhập : /auth/v1/signup, /auth/v1/token   (email + mật khẩu; mật khẩu chỉ đi qua gateway tới Supabase, không lưu)
 *   Quyền dùng          : RPC `claim_trial(p_machine)` rồi `get_entitlement(p_machine)` (supabase/schema.sql)
 * Máy chủ quyết định dùng thử 30 ngày: mỗi tài khoản một lần, mỗi máy một lần — tạo tài khoản khác trên cùng máy không thêm được.
 * Lưu cục bộ (account.dat, mã hoá AES-256-GCM, khoá suy ra từ mã máy): email, refresh token, quyền dùng đã xác nhận lần cuối.
 * Hạn chế trung thực: mã máy do máy khách gửi lên nên người dùng kỹ thuật có thể giả; đó là giới hạn của bản quyền phía máy khách.
 */
const TIMEOUT_MS = 10_000

export interface Entitlement { kind: EntitlementKind; expiresAt?: string; /** thời điểm (ms) máy chủ xác nhận lần cuối */ checkedAt: number }

export interface AccountManager {
  readonly configured: boolean
  status(): AccountStatusDto
  entitlement(): Entitlement | null
  /** true = đã đăng nhập luôn; false = cần xác nhận email trước. */
  signUp(email: string, password: string): Promise<boolean>
  signIn(email: string, password: string): Promise<void>
  signOut(): void
  /** Làm mới quyền dùng từ máy chủ (im lặng khi chưa đăng nhập; lỗi mạng giữ giá trị cũ). */
  refresh(): Promise<void>
}

interface Persisted { email: string; refreshToken: string; entitlement: Entitlement | null }

const KINDS: readonly EntitlementKind[] = ['trial', 'paid', 'expired', 'other_machine', 'machine_used', 'none']

export function createAccountManager(dir: string, opts: {
  machineCode: string; url?: string; anonKey?: string; now?: () => number; fetch?: typeof fetch
}): AccountManager {
  const url = (opts.url ?? process.env.MIKMASTER_SUPABASE_URL ?? SUPABASE_URL).replace(/\/+$/, '')
  const anonKey = opts.anonKey ?? process.env.MIKMASTER_SUPABASE_ANON_KEY ?? SUPABASE_ANON_KEY
  const configured = url !== '' && anonKey !== ''
  const now = opts.now ?? Date.now
  const doFetch = opts.fetch ?? fetch
  const file = path.join(dir, 'account.dat')
  const key = crypto.createHash('sha256').update(`mikmaster-account-v1|${opts.machineCode}|q9Lx2Vt8`).digest()

  let session: Persisted | null = null
  let access: { token: string; until: number } | null = null
  let lastError: string | undefined

  function load(): void {
    try {
      const raw = Buffer.from(fs.readFileSync(file, 'utf8'), 'base64')
      const d = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12))
      d.setAuthTag(raw.subarray(12, 28))
      const p = JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8')) as Persisted
      if (typeof p.email === 'string' && typeof p.refreshToken === 'string') session = p
    } catch { session = null } // không có / sai khoá (chép từ máy khác) / bị sửa → coi như chưa đăng nhập
  }
  function persist(): void {
    if (!session) { try { fs.unlinkSync(file) } catch { /* chưa có */ } return }
    const iv = crypto.randomBytes(12)
    const c = crypto.createCipheriv('aes-256-gcm', key, iv)
    const ct = Buffer.concat([c.update(JSON.stringify(session), 'utf8'), c.final()])
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
    fs.writeFileSync(file, Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64'), { mode: 0o600 })
  }
  if (configured) load()

  async function call(pathname: string, body: unknown, token?: string): Promise<unknown> {
    let res: Response
    try {
      res = await doFetch(`${url}${pathname}`, {
        method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store',
        headers: { apikey: anonKey, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      })
    } catch (err) {
      throw new DeviceError('connect', `Cannot reach the account server (${err instanceof Error ? err.message : 'network error'})`)
    }
    const text = await res.text()
    let json: Record<string, unknown> = {}
    try { json = text ? JSON.parse(text) as Record<string, unknown> : {} } catch { /* không phải JSON */ }
    if (res.ok) return json
    const code = String(json.error_code ?? json.code ?? '')
    const msg = String(json.msg ?? json.message ?? json.error_description ?? json.error ?? `HTTP ${res.status}`)
    if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) throw new DeviceError('auth', 'Wrong email or password')
    if (code === 'email_not_confirmed') throw new DeviceError('auth', 'Confirm your email first — open the link we sent you, then sign in')
    if (code === 'user_already_exists') throw new DeviceError('bad-request', 'This email is already registered — sign in instead')
    if (res.status === 429 || code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') throw new DeviceError('bad-request', 'Too many attempts — wait a few minutes and try again')
    if (res.status === 401 || res.status === 403) throw new DeviceError('auth', msg)
    throw new DeviceError('bad-request', msg)
  }

  function takeSession(email: string, j: Record<string, unknown>): void {
    const token = j.access_token, refresh = j.refresh_token
    if (typeof token !== 'string' || typeof refresh !== 'string') throw new DeviceError('protocol', 'Unexpected answer from the account server')
    access = { token, until: now() + (Number(j.expires_in) || 3600) * 1000 }
    session = { email: (j.user as { email?: string } | undefined)?.email ?? email, refreshToken: refresh, entitlement: session?.entitlement ?? null }
    persist()
  }

  async function accessToken(): Promise<string> {
    if (!session) throw new DeviceError('auth', 'Not signed in')
    if (access && access.until - now() > 60_000) return access.token
    try {
      takeSession(session.email, await call('/auth/v1/token?grant_type=refresh_token', { refresh_token: session.refreshToken }) as Record<string, unknown>)
    } catch (err) {
      if (err instanceof DeviceError && err.code === 'auth') { session = null; access = null; persist() } // refresh token bị thu hồi → đăng nhập lại
      throw err
    }
    return access!.token
  }

  async function syncEntitlement(claim: boolean): Promise<void> {
    const token = await accessToken()
    if (claim) await call('/rest/v1/rpc/claim_trial', { p_machine: opts.machineCode }, token)
    const e = await call('/rest/v1/rpc/get_entitlement', { p_machine: opts.machineCode }, token) as { state?: string; expires_at?: string | null }
    const kind = KINDS.includes(e.state as EntitlementKind) ? e.state as EntitlementKind : 'none'
    if (session) {
      session.entitlement = { kind, ...(typeof e.expires_at === 'string' ? { expiresAt: e.expires_at } : {}), checkedAt: now() }
      persist()
    }
  }

  return {
    configured,
    status() {
      return { configured, signedIn: session !== null, ...(session ? { email: session.email } : {}), ...(session?.entitlement ? { kind: session.entitlement.kind } : {}), ...(lastError ? { lastError } : {}) }
    },
    entitlement: () => session?.entitlement ?? null,
    async signUp(email, password) {
      if (!configured) throw new DeviceError('unsupported', 'Accounts are not configured')
      const j = await call('/auth/v1/signup', { email, password }) as Record<string, unknown>
      // Email đã đăng ký + bật xác nhận email: Supabase trả user không có identities để không lộ email nào đã có.
      if (Array.isArray((j.user as { identities?: unknown[] } | undefined)?.identities ?? j.identities) && ((j.user as { identities?: unknown[] } | undefined)?.identities ?? j.identities as unknown[]).length === 0) {
        throw new DeviceError('bad-request', 'This email is already registered — sign in instead')
      }
      if (typeof j.access_token !== 'string') return false // cần xác nhận email
      takeSession(email, j)
      await syncEntitlement(true)
      return true
    },
    async signIn(email, password) {
      if (!configured) throw new DeviceError('unsupported', 'Accounts are not configured')
      const previous = session
      takeSession(email, await call('/auth/v1/token?grant_type=password', { email, password }) as Record<string, unknown>)
      if (previous && previous.email !== session!.email) session!.entitlement = null // đổi tài khoản: bỏ quyền của tài khoản trước
      lastError = undefined
      await syncEntitlement(true)
    },
    signOut() { session = null; access = null; persist() },
    async refresh() {
      if (!configured || !session) return
      try { await syncEntitlement(session.entitlement?.kind === 'none' || session.entitlement === null); lastError = undefined }
      catch (err) { lastError = err instanceof Error ? err.message : String(err) }
    },
  }
}

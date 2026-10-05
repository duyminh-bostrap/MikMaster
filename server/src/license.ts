import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { LicenseStatusDto } from '../../shared/api.ts'
import type { AccountManager } from './account.ts'
import { BUILD_DATE } from './buildInfo.ts'
import { DEFAULT_LICENSE_CHECK_URL, LICENSE_PUBLIC_KEY } from './licenseKey.ts'
import { DeviceError } from './net/tcp.ts'

/*
 * Bản quyền MikMaster. Khoá dạng  MIKM1.<payload base64url>.<chữ ký Ed25519 base64url>  — kiểm ngoại tuyến bằng khoá
 * công khai nhúng trong app. Payload: { v:1, id, licensee, max (0 = không giới hạn), exp? (ISO), iat }.
 *
 * Chính sách:
 *   - Không có dùng thử cục bộ: mở app phải có khoá (hoặc tài khoản có quyền dùng). "Dùng thử 30 ngày" là một khoá có hạn 30 ngày
 *     do trang web cấp khi đăng ký tài khoản. (Dùng thử cục bộ TRIAL_DAYS chỉ còn bật được bằng `localTrial`, dành cho test.)
 *   - Hai bản: FREE (chưa có khoá hợp lệ / hết hạn / quá hạn cập nhật…) chỉ bật / tắt máy và shutter; PRO (khoá hợp lệ) mở khoá preview,
 *     chỉnh thông số (input, OSD, test pattern, lens, độ sáng, RAW…). App hiện trang license khi mở ở bản Free, có thể bỏ qua.
 *   - Có khoá hợp lệ: tối đa `max` máy (0 = không giới hạn).
 * Số máy tính theo địa chỉ máy chiếu gateway đã làm việc cùng trong ACTIVE_WINDOW_MS gần nhất.
 * Đây là rào chắn trung thực cho người dùng bình thường, không phải chống bẻ khoá (khoá công khai nằm trong app).
 */
export const TRIAL_DAYS = 30
export const FREE_LIMIT = 3
const ACTIVE_WINDOW_MS = 10 * 60_000
const DAY_MS = 86_400_000
const PREFIX = 'MIKM1'
const STATUS_PREFIX = 'MIKS1'
/** Phải kiểm tra được với mạng ít nhất mỗi ngần này ngày, không thì bị giới hạn cho tới khi kết nối lại. */
export const ONLINE_GRACE_DAYS = 30
/** Báo trước: còn ngần này ngày (hoặc ít hơn) tới hạn kết nối / hết hạn khoá thì cảnh báo. */
export const WARN_DAYS = 14
const CHECK_TIMEOUT_MS = 8000

/** `mc` = mã máy: khoá chỉ dùng được trên máy có mã này (bỏ trống = dùng được mọi máy). */
export interface LicensePayload { v: 1 | 2; id: string; licensee: string; max: number; exp?: string; /** cập nhật đến hết ngày này (dùng vĩnh viễn các bản phát hành đến ngày đó) */ upd?: string; iat?: string; mc?: string }

/** Chuẩn hoá mã máy do người dùng gõ: chữ hoa, bỏ khoảng trắng, dạng XXXX-XXXX-XXXX-XXXX. */
export function normalizeMachineCode(code: string): string | null {
  const hex = code.replace(/[\s-]/g, '').toUpperCase()
  return /^[0-9A-F]{16}$/.test(hex) ? hex.match(/.{4}/g)!.join('-') : null
}

function rawMachineId(dir: string): string {
  try {
    if (process.platform === 'darwin') {
      const out = execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], { encoding: 'utf8', timeout: 3000 })
      const m = /"IOPlatformUUID" = "([^"]+)"/.exec(out)
      if (m) return m[1]!
    } else if (process.platform === 'win32') {
      const out = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], { encoding: 'utf8', timeout: 3000 })
      const m = /MachineGuid\s+REG_SZ\s+(\S+)/.exec(out)
      if (m) return m[1]!
    } else {
      for (const f of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
        try { const v = fs.readFileSync(f, 'utf8').trim(); if (v) return v } catch { /* thử file kế */ }
      }
    }
  } catch { /* không đọc được định danh máy → dùng mã ngẫu nhiên lưu cạnh dữ liệu */ }
  const file = path.join(dir, 'machine.id')
  try { return fs.readFileSync(file, 'utf8').trim() } catch { /* tạo mới */ }
  const id = crypto.randomBytes(16).toString('hex')
  fs.writeFileSync(file, id, { mode: 0o600 })
  return id
}

/** Mã máy: băm một chiều của định danh phần cứng — không lộ định danh gốc. */
export function computeMachineCode(dir: string): string {
  const h = crypto.createHash('sha256').update(`mikmaster:${rawMachineId(dir)}`).digest('hex').slice(0, 16).toUpperCase()
  return h.match(/.{4}/g)!.join('-')
}

const b64url = (b: Buffer) => b.toString('base64url')

function signToken(privateKeyPem: string, prefix: string, body: object): string {
  const json = Buffer.from(JSON.stringify(body))
  return `${prefix}.${b64url(json)}.${b64url(crypto.sign(null, json, crypto.createPrivateKey(privateKeyPem)))}`
}

function verifyToken(token: string, prefix: string, publicKeyDer: string): unknown | null {
  const parts = token.trim().split('.')
  if (parts.length !== 3 || parts[0] !== prefix) return null
  try {
    const json = Buffer.from(parts[1]!, 'base64url')
    const ok = crypto.verify(null, json, crypto.createPublicKey({ key: Buffer.from(publicKeyDer, 'base64'), type: 'spki', format: 'der' }), Buffer.from(parts[2]!, 'base64url'))
    return ok ? JSON.parse(json.toString('utf8')) : null
  } catch { return null }
}

/** File trạng thái bản quyền đã ký: danh sách id khoá bị thu hồi. Người cấp đăng lên địa chỉ kiểm tra. */
export interface LicenseStatusDoc { v: 1; issuedAt: string; revoked: string[] }

export function signStatusDoc(privateKeyPem: string, revoked: string[], issuedAt = new Date().toISOString()): string {
  return signToken(privateKeyPem, STATUS_PREFIX, { v: 1, issuedAt, revoked } satisfies LicenseStatusDoc)
}

export function verifyStatusDoc(token: string, publicKeyDer = LICENSE_PUBLIC_KEY): LicenseStatusDoc | null {
  const d = verifyToken(token, STATUS_PREFIX, publicKeyDer) as Partial<LicenseStatusDoc> | null
  if (!d || d.v !== 1 || typeof d.issuedAt !== 'string' || Number.isNaN(Date.parse(d.issuedAt)) || !Array.isArray(d.revoked) || !d.revoked.every(x => typeof x === 'string')) return null
  return d as LicenseStatusDoc
}

const KEY_PREFIX_V2 = 'MIKM2'
const EPOCH_MS = Date.UTC(2020, 0, 1)
const MAX_ID_BYTES = 12
const MAX_NAME_BYTES = 40
const SIG_BYTES = 64

const dayOf = (iso: string) => Math.floor((Date.parse(iso) - EPOCH_MS) / DAY_MS)
/** Khoá hết hạn vào CUỐI ngày (UTC) ghi trong khoá. */
const endOfDay = (day: number) => new Date(EPOCH_MS + (day + 1) * DAY_MS - 1).toISOString()

/**
 * Định dạng gọn (MIKM2): nhị phân [cờ][độ dài id][id][max u16][hạn u16 nếu có][mã máy 8 byte nếu có][độ dài tên][tên] + chữ ký Ed25519
 * 64 byte, mã hoá base64url. Khoảng 100–130 ký tự (định dạng cũ MIKM1 dạng JSON ~220 ký tự vẫn dùng được). Chữ ký Ed25519 luôn 64 byte
 * (~86 ký tự) nên không thể ngắn hơn nhiều mà vẫn an toàn — muốn ngắn hơn phải kiểm số serial qua máy chủ.
 * Chữ ký phủ cả tiền tố "MIKM2\0" để không ai dùng lại chữ ký của loại dữ liệu khác (file trạng thái, khoá cũ).
 */
function encodeV2(p: { id: string; licensee: string; max: number; exp?: string; upd?: string; mc?: string }): Buffer {
  const id = Buffer.from(p.id, 'utf8'), name = Buffer.from(p.licensee, 'utf8')
  if (id.length < 1 || id.length > MAX_ID_BYTES) throw new Error(`id must be 1–${MAX_ID_BYTES} bytes`)
  if (name.length > MAX_NAME_BYTES) throw new Error(`licensee must be at most ${MAX_NAME_BYTES} bytes`)
  if (!Number.isInteger(p.max) || p.max < 0 || p.max > 0xffff) throw new Error('max must be 0–65535')
  const parts: Buffer[] = [Buffer.from([(p.exp ? 1 : 0) | (p.mc ? 2 : 0) | (p.upd ? 4 : 0), id.length]), id, u16(p.max)]
  if (p.exp) {
    const d = dayOf(p.exp)
    if (!(d >= 0 && d <= 0xffff)) throw new Error('exp out of range')
    parts.push(u16(d))
  }
  if (p.upd) {
    const d = dayOf(p.upd)
    if (!(d >= 0 && d <= 0xffff)) throw new Error('upd out of range')
    parts.push(u16(d))
  }
  if (p.mc) parts.push(Buffer.from(p.mc.replace(/-/g, ''), 'hex'))
  parts.push(Buffer.from([name.length]), name)
  return Buffer.concat(parts)
}
const u16 = (n: number) => Buffer.from([n >> 8, n & 255])

function decodeV2(b: Buffer): LicensePayload | null {
  let i = 0
  const need = (n: number) => { if (i + n > b.length) throw new Error('short'); const o = i; i += n; return o }
  try {
    const flags = b[need(1)]!
    if (flags > 7) return null
    const idLen = b[need(1)]!
    if (idLen < 1 || idLen > MAX_ID_BYTES) return null
    const id = b.subarray(need(idLen), i).toString('utf8')
    const max = b.readUInt16BE(need(2))
    const exp = flags & 1 ? endOfDay(b.readUInt16BE(need(2))) : undefined
    const upd = flags & 4 ? endOfDay(b.readUInt16BE(need(2))) : undefined
    const mc = flags & 2 ? normalizeMachineCode(b.subarray(need(8), i).toString('hex')) ?? undefined : undefined
    const nameLen = b[need(1)]!
    if (nameLen > MAX_NAME_BYTES) return null
    const licensee = b.subarray(need(nameLen), i).toString('utf8')
    if (i !== b.length) return null
    return { v: 2, id, licensee, max, ...(exp ? { exp } : {}), ...(upd ? { upd } : {}), ...(mc ? { mc } : {}) }
  } catch { return null }
}

const spki = (der: string) => crypto.createPublicKey({ key: Buffer.from(der, 'base64'), type: 'spki', format: 'der' })
const v2Message = (body: Buffer) => Buffer.concat([Buffer.from(`${KEY_PREFIX_V2}\0`), body])

/** Ký một license (dùng ở scripts/license.mjs và test): định dạng gọn MIKM2. */
export function signLicense(privateKeyPem: string, payload: { id: string; licensee: string; max: number; exp?: string; upd?: string; mc?: string }): string {
  const body = encodeV2(payload)
  const sig = crypto.sign(null, v2Message(body), crypto.createPrivateKey(privateKeyPem))
  return `${KEY_PREFIX_V2}-${b64url(Buffer.concat([body, sig]))}`
}

/** Ký theo định dạng cũ MIKM1 (chỉ để test tương thích ngược). */
export function signLicenseV1(privateKeyPem: string, payload: Omit<LicensePayload, 'v' | 'iat'> & { iat?: string }): string {
  const json = Buffer.from(JSON.stringify({ v: 1, iat: new Date().toISOString(), ...payload }))
  return `${PREFIX}.${b64url(json)}.${b64url(crypto.sign(null, json, crypto.createPrivateKey(privateKeyPem)))}`
}

/** Kiểm chữ ký và định dạng (MIKM2 hoặc MIKM1); KHÔNG kiểm hạn dùng (để báo "đã hết hạn" chứ không phải "sai khoá"). */
export function verifyLicense(key: string, publicKeyDer = LICENSE_PUBLIC_KEY): LicensePayload | null {
  const k = key.replace(/\s+/g, '') // người dùng có thể dán khoá bị xuống dòng
  if (k.startsWith(`${KEY_PREFIX_V2}-`)) {
    try {
      const raw = Buffer.from(k.slice(KEY_PREFIX_V2.length + 1), 'base64url')
      if (raw.length <= SIG_BYTES) return null
      const body = raw.subarray(0, raw.length - SIG_BYTES)
      if (!crypto.verify(null, v2Message(body), spki(publicKeyDer), raw.subarray(raw.length - SIG_BYTES))) return null
      return decodeV2(body)
    } catch { return null }
  }
  const p = verifyToken(k, PREFIX, publicKeyDer) as Partial<LicensePayload> | null
  if (!p || p.v !== 1 || typeof p.id !== 'string' || typeof p.licensee !== 'string' || !Number.isInteger(p.max) || (p.max as number) < 0) return null
  if (p.exp !== undefined && (typeof p.exp !== 'string' || Number.isNaN(Date.parse(p.exp)))) return null
  if (p.mc !== undefined && (typeof p.mc !== 'string' || normalizeMachineCode(p.mc) !== p.mc)) return null
  return p as LicensePayload
}

const RELEASE_PREFIX = 'MIKR1'

export function releaseCodeFor(lic: LicensePayload, machine: string, at: number): string {
  return `${RELEASE_PREFIX}.${Buffer.from(JSON.stringify({ id: lic.id, mc: machine, at: new Date(at).toISOString() })).toString('base64url')}`
}

export function parseReleaseCode(code: string): { id: string; mc: string; at: string } | null {
  const [prefix, body] = code.trim().split('.')
  if (prefix !== RELEASE_PREFIX || !body) return null
  try {
    const r = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { id?: unknown; mc?: unknown; at?: unknown }
    return typeof r.id === 'string' && typeof r.mc === 'string' && typeof r.at === 'string' ? { id: r.id, mc: r.mc, at: r.at } : null
  } catch { return null }
}

export interface LicenseManager {
  status(): LicenseStatusDto
  install(key: string): LicenseStatusDto
  remove(): LicenseStatusDto
  /** Tải file trạng thái đã ký từ địa chỉ kiểm tra; thành công thì tính là "đã kiểm tra" (không có địa chỉ → không làm gì). */
  checkNow(): Promise<LicenseStatusDto>
  /** Gọi trước khi làm việc với một máy chiếu; ném DeviceError('license') nếu không được phép (khoá có giới hạn số máy bị vượt). */
  check(host: string, kind: 'status' | 'control'): void
  /** Gọi trước tính năng của bản Pro (preview, chỉnh thông số, RAW…); bản Free (chưa có license hợp lệ) bị từ chối bằng DeviceError('license'). */
  requirePro(feature: string): void
}

/** Trạng thái cục bộ: mốc dùng thử, đồng hồ đã thấy, lần kiểm tra mạng gần nhất và danh sách thu hồi. */
interface LocalState { firstRun: number; lastSeen: number; lastOk: number; revoked: string[]; docIssuedAt?: string }

/**
 * Lưu trạng thái ở nhiều nơi, mỗi bản được niêm phong bằng HMAC (khoá suy ra từ mã máy + hằng số trong app):
 *  - sửa tay file → sai chữ ký → coi là bị can thiệp (hết dùng thử, phải kiểm tra mạng lại);
 *  - xoá một bản → khôi phục từ bản còn lại (xoá hết mới được dùng thử lại);
 *  - chép file từ máy khác → sai chữ ký (khoá gắn với mã máy).
 * Không phải bất khả xâm phạm: ai vá được mã của app thì gỡ được mọi rào chắn (xem docs/features.md).
 */
function createStateStore(files: string[], machineCode: string, now: () => number) {
  const macKey = crypto.createHash('sha256').update(`mikmaster-state-v1|${machineCode}|k7Qe2vX9pLm4`).digest()
  const mac = (data: string) => crypto.createHmac('sha256', macKey).update(data).digest('hex')
  const seal = (st: LocalState) => { const d = JSON.stringify(st); return JSON.stringify({ d, m: mac(d) }) }

  function readOne(file: string): LocalState | 'missing' | 'tampered' {
    let raw: string
    try { raw = fs.readFileSync(file, 'utf8') } catch { return 'missing' }
    try {
      const { d, m } = JSON.parse(raw) as { d: string; m: string }
      if (typeof d !== 'string' || typeof m !== 'string' || !crypto.timingSafeEqual(Buffer.from(mac(d)), Buffer.from(m.padEnd(64, '0').slice(0, 64)))) return 'tampered'
      const st = JSON.parse(d) as Partial<LocalState>
      if (![st.firstRun, st.lastSeen, st.lastOk].every(Number.isFinite)) return 'tampered'
      return { firstRun: st.firstRun!, lastSeen: st.lastSeen!, lastOk: st.lastOk!, revoked: Array.isArray(st.revoked) ? st.revoked.filter(x => typeof x === 'string') : [], docIssuedAt: st.docIssuedAt }
    } catch { return 'tampered' }
  }

  function write(st: LocalState): void {
    for (const f of files) {
      try { fs.mkdirSync(path.dirname(f), { recursive: true, mode: 0o700 }); fs.writeFileSync(f, seal(st), { mode: 0o600 }) } catch { /* nơi lưu phụ không ghi được (quyền) → bỏ qua */ }
    }
  }

  function load(): LocalState {
    const found = files.map(readOne)
    const valid = found.filter((x): x is LocalState => typeof x === 'object')
    if (valid.length === 0) {
      const t = now()
      // Không có bản nào: máy mới → bắt đầu dùng thử. Có bản nhưng đều sai chữ ký → bị can thiệp: hết dùng thử, chưa kiểm tra mạng.
      const tampered = found.includes('tampered')
      const st: LocalState = tampered ? { firstRun: 0, lastSeen: t, lastOk: 0, revoked: [] } : { firstRun: t, lastSeen: t, lastOk: t, revoked: [] }
      write(st)
      return st
    }
    const newest = valid.reduce((a, b) => (Date.parse(b.docIssuedAt ?? '') > Date.parse(a.docIssuedAt ?? '') ? b : a))
    const st: LocalState = {
      firstRun: Math.min(...valid.map(v => v.firstRun)),
      lastSeen: Math.max(...valid.map(v => v.lastSeen)),
      lastOk: Math.max(...valid.map(v => v.lastOk)),
      revoked: newest.revoked, docIssuedAt: newest.docIssuedAt,
    }
    // Một bản bị sửa / mất thì ghi lại từ bản hợp lệ; nếu có bản bị sửa thì coi như bị can thiệp.
    if (found.includes('tampered')) { st.firstRun = 0; st.lastOk = 0 }
    if (found.some(f => f === 'missing' || f === 'tampered')) write(st)
    return st
  }

  return { load, write }
}

export function createLicenseManager(dir: string, opts: {
  now?: () => number; publicKey?: string; machineCode?: string; checkUrl?: string; fetch?: typeof fetch
  /** Nơi lưu bản sao trạng thái ngoài thư mục dữ liệu; mặc định ~/.mikmaster. `null` = không dùng (test). */
  mirrorDir?: string | null
  /** Tài khoản Supabase: khi đã cấu hình, dùng thử 30 ngày do máy chủ quyết định theo tài khoản + máy (thay cho dùng thử cục bộ). */
  account?: AccountManager
  /** Ngày phát hành của bản build (mặc định BUILD_DATE); chỉ để test. */
  buildDate?: string
  /** Bật dùng thử cục bộ TRIAL_DAYS ngày (mặc định tắt: phải có khoá). Chỉ dành cho test. */
  localTrial?: boolean
} = {}): LicenseManager {
  const account = opts.account?.configured ? opts.account : undefined
  const buildDate = opts.buildDate ?? BUILD_DATE
  const buildMs = Date.parse(buildDate)
  const realNow = opts.now ?? Date.now
  const publicKey = opts.publicKey ?? LICENSE_PUBLIC_KEY
  const keyFile = path.join(dir, 'license.key')
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  const machineCode = opts.machineCode ?? computeMachineCode(dir)
  const checkUrl = opts.checkUrl ?? process.env.MIKMASTER_LICENSE_URL ?? DEFAULT_LICENSE_CHECK_URL
  const doFetch = opts.fetch ?? fetch
  const mirror = opts.mirrorDir === undefined ? path.join(os.homedir(), '.mikmaster') : opts.mirrorDir
  const store = createStateStore([path.join(dir, 'state.dat'), ...(mirror ? [path.join(mirror, 'state.dat')] : [])], machineCode, realNow)
  let state = store.load()
  let lastError: string | undefined

  /**
   * Thời gian "hiệu lực": không bao giờ lùi so với mốc đã thấy → chỉnh đồng hồ máy lùi để kéo dài dùng thử / hạn khoá / hạn
   * kiểm tra mạng không có tác dụng. Ghi mốc mới nhiều nhất mỗi phút.
   */
  function now(): number {
    const t = Math.max(realNow(), state.lastSeen)
    if (t - state.lastSeen > 60_000) save({ lastSeen: t })
    return t
  }
  function save(patch: Partial<LocalState>): void {
    state = { ...state, ...patch }
    store.write(state)
  }

  /** Khoá đã lưu, còn hợp lệ với máy này (khoá gắn máy khác thì coi như không có). */
  function stored(): LicensePayload | null {
    try {
      const lic = verifyLicense(fs.readFileSync(keyFile, 'utf8'), publicKey)
      return lic && (lic.mc === undefined || lic.mc === machineCode) ? lic : null
    } catch { return null }
  }

  function compute(): LicenseStatusDto {
    const t = now()
    const lic = stored()
    if (lic) {
      const expiresMs = lic.exp !== undefined ? Date.parse(lic.exp) : undefined
      const expired = expiresMs !== undefined && expiresMs < t
      const configured = checkUrl !== ''
      const daysLeft = configured ? Math.ceil((state.lastOk + ONLINE_GRACE_DAYS * DAY_MS - t) / DAY_MS) : undefined
      const revoked = configured && state.revoked.includes(lic.id)
      const unverified = configured && (daysLeft as number) <= 0
      // Dùng vĩnh viễn + cập nhật đến ngày `upd`: bản phát hành sau ngày đó không mở được (bản cũ hơn vẫn dùng được).
      const updMs = lic.upd !== undefined ? Date.parse(lic.upd) : undefined
      const outdated = updMs !== undefined && buildMs > updMs
      const st = revoked ? 'revoked' : expired ? 'expired' : outdated ? 'outdated' : unverified ? 'unverified' : 'licensed'
      const fromKey: LicenseStatusDto = {
        state: st, licensee: lic.licensee, id: lic.id, maxProjectors: lic.max, expiresAt: lic.exp, freeLimit: FREE_LIMIT,
        restricted: st !== 'licensed', machineCode, bound: lic.mc !== undefined, buildDate,
        ...(updMs !== undefined ? { updatesUntil: lic.upd } : {}),
        ...(updMs !== undefined && !outdated ? { updatesInDays: Math.ceil((updMs - t) / DAY_MS) } : {}),
        ...(expiresMs !== undefined && !expired ? { expiresInDays: Math.ceil((expiresMs - t) / DAY_MS) } : {}),
        online: { configured, ...(configured ? { lastCheckAt: new Date(state.lastOk).toISOString(), daysLeft: Math.max(0, daysLeft as number) } : {}), ...(lastError ? { lastError } : {}) },
      }
      // Khoá hết hạn / bị thu hồi mà tài khoản còn quyền dùng → dùng quyền của tài khoản.
      if (fromKey.restricted && account) { const a = fromAccount(t); if (!a.restricted) return a }
      return fromKey
    }
    if (account) return fromAccount(t)
    const left = opts.localTrial ? Math.ceil((state.firstRun + TRIAL_DAYS * DAY_MS - t) / DAY_MS) : 0
    if (left > 0) return { state: 'trial', trialDaysLeft: left, freeLimit: FREE_LIMIT, restricted: false, machineCode }
    return { state: 'unlicensed', trialDaysLeft: 0, freeLimit: FREE_LIMIT, restricted: true, machineCode }
  }

  /** Không có khoá hợp lệ + có hệ thống tài khoản: quyền dùng lấy từ máy chủ (đăng nhập → dùng thử 30 ngày / trả phí). */
  function fromAccount(t: number): LicenseStatusDto {
    const acc = account!.status()
    const e = account!.entitlement()
    const base = { freeLimit: FREE_LIMIT, machineCode }
    if (!acc.signedIn || !e) return { ...base, state: 'signin', restricted: true }
    const graceLeft = Math.ceil((e.checkedAt + ONLINE_GRACE_DAYS * DAY_MS - t) / DAY_MS)
    const online = { configured: true, lastCheckAt: new Date(e.checkedAt).toISOString(), daysLeft: Math.max(0, graceLeft), ...(acc.lastError ? { lastError: acc.lastError } : {}) }
    if (e.kind === 'trial' || e.kind === 'paid') {
      const expiresMs = e.expiresAt ? Date.parse(e.expiresAt) : Infinity
      if (expiresMs < t) return { ...base, state: 'expired', restricted: true, licensee: acc.email, expiresAt: e.expiresAt, online }
      if (graceLeft <= 0) return { ...base, state: 'unverified', restricted: true, licensee: acc.email, online }
      // Gói mua kiểu "dùng vĩnh viễn + cập nhật đến ngày X" (máy chủ trả updatesUntil): bản phát hành sau ngày đó không mở được.
      if (e.kind === 'paid' && e.updatesUntil !== undefined && buildMs > Date.parse(e.updatesUntil)) {
        return { ...base, state: 'outdated', restricted: true, licensee: acc.email, updatesUntil: e.updatesUntil, buildDate, online }
      }
      const days = Number.isFinite(expiresMs) ? Math.ceil((expiresMs - t) / DAY_MS) : undefined
      return e.kind === 'trial'
        ? { ...base, state: 'trial', trialDaysLeft: days ?? 0, restricted: false, licensee: acc.email, expiresAt: e.expiresAt, buildDate, online }
        : {
            ...base, state: 'licensed', maxProjectors: 0, restricted: false, licensee: acc.email, buildDate, online,
            ...(e.expiresAt ? { expiresAt: e.expiresAt } : {}),
            ...(days !== undefined && e.updatesUntil === undefined ? { expiresInDays: days } : {}),
            ...(e.updatesUntil !== undefined ? { updatesUntil: e.updatesUntil, updatesInDays: Math.ceil((Date.parse(e.updatesUntil) - t) / DAY_MS) } : {}),
          }
    }
    return { ...base, state: e.kind === 'expired' ? 'expired' : 'unlicensed', restricted: true, licensee: acc.email, online }
  }

  function status(): LicenseStatusDto {
    const s = compute()
    // `gate`: app hiện trang yêu cầu license (không có quyền dùng). Luôn bật khi bị giới hạn; `account` chỉ có khi đã cấu hình tài khoản.
    // `edition`: free = chưa có license hợp lệ (chỉ bật / tắt máy và shutter); pro = mở khoá preview, chỉnh thông số…
    return { ...s, edition: s.restricted ? 'free' : 'pro', gate: s.restricted, ...(account ? { account: account.status() } : {}) }
  }

  const active = new Map<string, number>()
  function check(host: string, kind: 'status' | 'control'): void {
    void kind
    const s = status()
    // Bản Free (chưa có license hợp lệ) dùng được bật / tắt máy và shutter cho mọi máy, không giới hạn số máy.
    // Giới hạn số máy chỉ áp cho khoá có `max`.
    const limit = !s.restricted && s.state === 'licensed' && s.maxProjectors ? s.maxProjectors : Infinity
    const t = now()
    for (const [h, seen] of active) if (t - seen > ACTIVE_WINDOW_MS) active.delete(h)
    if (!active.has(host) && active.size >= limit) {
      throw new DeviceError('license', `This license covers ${limit} projector${limit === 1 ? '' : 's'} — enter a larger license key in Settings`)
    }
    active.set(host, t)
  }

  function requirePro(feature: string): void {
    const s = status()
    if (!s.restricted) return
    const why =
      s.state === 'expired' ? 'the license has expired — enter a new license key'
      : s.state === 'revoked' ? 'this license has been revoked — contact the license issuer'
      : s.state === 'outdated' ? `this version was released after your updates ended on ${s.updatesUntil?.slice(0, 10)} — use an earlier version or renew your updates`
      : s.state === 'signin' ? 'sign in to your MikMaster account or enter a license key'
      : s.state === 'unverified' ? `the license has not been verified online for ${ONLINE_GRACE_DAYS} days — connect this computer to the internet (Settings → License → Check now)`
      : 'enter a license key (Settings → License)'
    throw new DeviceError('license', `${feature} is a MikMaster Pro feature — ${why}`)
  }

  return {
    status,
    check,
    requirePro,
    async checkNow() {
      await account?.refresh()
      if (checkUrl === '') return status()
      try {
        const res = await doFetch(checkUrl, { signal: AbortSignal.timeout(CHECK_TIMEOUT_MS), cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const doc = verifyStatusDoc((await res.text()).slice(0, 64_000), publicKey)
        if (!doc) throw new Error('The license status file is not signed by the license issuer')
        if (state.docIssuedAt !== undefined && Date.parse(doc.issuedAt) < Date.parse(state.docIssuedAt)) throw new Error('The license status file is older than the one already received')
        save({ lastOk: now(), revoked: doc.revoked, docIssuedAt: doc.issuedAt })
        lastError = undefined
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
      }
      return status()
    },
    install(key) {
      const lic = verifyLicense(key, publicKey)
      if (!lic) throw new DeviceError('bad-request', 'This is not a valid MikMaster license key')
      if (lic.mc !== undefined && lic.mc !== machineCode) throw new DeviceError('bad-request', `This key is for another computer (${lic.mc}); this computer is ${machineCode}`)
      if (lic.exp !== undefined && Date.parse(lic.exp) < now()) throw new DeviceError('bad-request', `This license expired on ${lic.exp.slice(0, 10)}`)
      fs.writeFileSync(keyFile, key.replace(/\s+/g, ''), { mode: 0o600 })
      save({ lastOk: now() }) // cài khoá mới tính là vừa kiểm tra
      return status()
    },
    remove() {
      const lic = stored()
      try { fs.unlinkSync(keyFile) } catch { /* chưa cài */ }
      const s = status()
      // Mã gỡ: người cấp dùng nó (scripts/license.mjs rebind) để cấp lại khoá cho máy khác. Chỉ là biên nhận — không có máy chủ
      // nên không thể chặn ai đó cài lại khoá cũ trên máy này; khoá gắn máy thì máy khác không dùng được.
      return lic ? { ...s, releaseCode: releaseCodeFor(lic, machineCode, now()) } : s
    },
  }
}

import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { LicenseStatusDto } from '../../shared/api.ts'
import { LICENSE_PUBLIC_KEY } from './licenseKey.ts'
import { DeviceError } from './net/tcp.ts'

/*
 * Bản quyền MikMaster. Khoá dạng  MIKM1.<payload base64url>.<chữ ký Ed25519 base64url>  — kiểm ngoại tuyến bằng khoá
 * công khai nhúng trong app. Payload: { v:1, id, licensee, max (0 = không giới hạn), exp? (ISO), iat }.
 *
 * Chính sách:
 *   - Dùng thử TRIAL_DAYS ngày kể từ lần chạy đầu, đủ tính năng.
 *   - Hết dùng thử mà chưa có khoá hợp lệ (hoặc khoá hết hạn): chỉ XEM trạng thái tối đa FREE_LIMIT máy, không gửi lệnh.
 *   - Có khoá hợp lệ: tối đa `max` máy (0 = không giới hạn).
 * Số máy tính theo địa chỉ máy chiếu gateway đã làm việc cùng trong ACTIVE_WINDOW_MS gần nhất.
 * Đây là rào chắn trung thực cho người dùng bình thường, không phải chống bẻ khoá (khoá công khai nằm trong app).
 */
export const TRIAL_DAYS = 30
export const FREE_LIMIT = 3
const ACTIVE_WINDOW_MS = 10 * 60_000
const DAY_MS = 86_400_000
const PREFIX = 'MIKM1'

/** `mc` = mã máy: khoá chỉ dùng được trên máy có mã này (bỏ trống = dùng được mọi máy). */
export interface LicensePayload { v: 1; id: string; licensee: string; max: number; exp?: string; iat: string; mc?: string }

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

/** Ký một license (dùng ở scripts/license.mjs và test). */
export function signLicense(privateKeyPem: string, payload: Omit<LicensePayload, 'v' | 'iat'> & { iat?: string }): string {
  const body: LicensePayload = { v: 1, iat: new Date().toISOString(), ...payload }
  const json = Buffer.from(JSON.stringify(body))
  const sig = crypto.sign(null, json, crypto.createPrivateKey(privateKeyPem))
  return `${PREFIX}.${b64url(json)}.${b64url(sig)}`
}

/** Kiểm chữ ký và định dạng; KHÔNG kiểm hạn dùng (để báo "đã hết hạn" chứ không phải "sai khoá"). */
export function verifyLicense(key: string, publicKeyDer = LICENSE_PUBLIC_KEY): LicensePayload | null {
  const parts = key.trim().split('.')
  if (parts.length !== 3 || parts[0] !== PREFIX) return null
  try {
    const json = Buffer.from(parts[1]!, 'base64url')
    const ok = crypto.verify(null, json, crypto.createPublicKey({ key: Buffer.from(publicKeyDer, 'base64'), type: 'spki', format: 'der' }), Buffer.from(parts[2]!, 'base64url'))
    if (!ok) return null
    const p = JSON.parse(json.toString('utf8')) as Partial<LicensePayload>
    if (p.v !== 1 || typeof p.id !== 'string' || typeof p.licensee !== 'string' || !Number.isInteger(p.max) || (p.max as number) < 0) return null
    if (p.exp !== undefined && Number.isNaN(Date.parse(p.exp))) return null
    if (p.mc !== undefined && (typeof p.mc !== 'string' || normalizeMachineCode(p.mc) !== p.mc)) return null
    return p as LicensePayload
  } catch { return null }
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
  /** Gọi trước khi làm việc với một máy chiếu; ném DeviceError('license') nếu không được phép. */
  check(host: string, kind: 'status' | 'control'): void
}

export function createLicenseManager(dir: string, opts: { now?: () => number; publicKey?: string; machineCode?: string } = {}): LicenseManager {
  const now = opts.now ?? Date.now
  const publicKey = opts.publicKey ?? LICENSE_PUBLIC_KEY
  const keyFile = path.join(dir, 'license.key')
  const trialFile = path.join(dir, 'trial.json')
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })

  function trialStart(): number {
    try {
      const t = Number(JSON.parse(fs.readFileSync(trialFile, 'utf8')).firstRun)
      if (Number.isFinite(t)) return t
    } catch { /* chưa có → bắt đầu từ bây giờ */ }
    const t = now()
    fs.writeFileSync(trialFile, JSON.stringify({ firstRun: t }), { mode: 0o600 })
    return t
  }
  trialStart()
  const machineCode = opts.machineCode ?? computeMachineCode(dir)

  /** Khoá đã lưu, còn hợp lệ với máy này (khoá gắn máy khác thì coi như không có). */
  function stored(): LicensePayload | null {
    try {
      const lic = verifyLicense(fs.readFileSync(keyFile, 'utf8'), publicKey)
      return lic && (lic.mc === undefined || lic.mc === machineCode) ? lic : null
    } catch { return null }
  }

  function status(): LicenseStatusDto {
    const lic = stored()
    if (lic) {
      const expired = lic.exp !== undefined && Date.parse(lic.exp) < now()
      return { state: expired ? 'expired' : 'licensed', licensee: lic.licensee, id: lic.id, maxProjectors: lic.max, expiresAt: lic.exp, freeLimit: FREE_LIMIT, restricted: expired, machineCode, bound: lic.mc !== undefined }
    }
    const left = Math.ceil((trialStart() + TRIAL_DAYS * DAY_MS - now()) / DAY_MS)
    if (left > 0) return { state: 'trial', trialDaysLeft: left, freeLimit: FREE_LIMIT, restricted: false, machineCode }
    return { state: 'unlicensed', trialDaysLeft: 0, freeLimit: FREE_LIMIT, restricted: true, machineCode }
  }

  const active = new Map<string, number>()
  function check(host: string, kind: 'status' | 'control'): void {
    const s = status()
    if (s.restricted && kind === 'control') {
      throw new DeviceError('license', s.state === 'expired' ? 'The MikMaster license has expired — enter a new license key in Settings' : 'The 30-day trial has ended — enter a license key in Settings to control projectors')
    }
    const limit = s.restricted ? FREE_LIMIT : s.state === 'licensed' && s.maxProjectors ? s.maxProjectors : Infinity
    const t = now()
    for (const [h, seen] of active) if (t - seen > ACTIVE_WINDOW_MS) active.delete(h)
    if (!active.has(host) && active.size >= limit) {
      throw new DeviceError('license', `This license covers ${limit} projector${limit === 1 ? '' : 's'} — enter a larger license key in Settings`)
    }
    active.set(host, t)
  }

  return {
    status,
    check,
    install(key) {
      const lic = verifyLicense(key, publicKey)
      if (!lic) throw new DeviceError('bad-request', 'This is not a valid MikMaster license key')
      if (lic.mc !== undefined && lic.mc !== machineCode) throw new DeviceError('bad-request', `This key is for another computer (${lic.mc}); this computer is ${machineCode}`)
      if (lic.exp !== undefined && Date.parse(lic.exp) < now()) throw new DeviceError('bad-request', `This license expired on ${lic.exp.slice(0, 10)}`)
      fs.writeFileSync(keyFile, key.trim(), { mode: 0o600 })
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

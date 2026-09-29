import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { QUICK_LOGIN_BRANDS, type ProjectSnapshotDto, type ProjectSummaryDto, type QuickLoginsDto } from '../../shared/api.ts'
import { DeviceError } from './net/tcp.ts'

/*
 * Lưu project thành file JSON trong thư mục dữ liệu (mặc định `data/`, đổi bằng MIKMASTER_DATA).
 * Mật khẩu máy chiếu không bao giờ nằm dạng thường trên đĩa: mã hoá AES-256-GCM bằng khoá 32 byte
 * lấy từ MIKMASTER_KEY (base64) hoặc file `secret.key` (tự sinh, quyền 0600). Mất khoá = mất mật khẩu
 * (project vẫn mở được, mật khẩu phải nhập lại).
 */

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/
const PREFIX = 'enc:v1:'

export function isValidProjectId(id: string): boolean {
  return ID_RE.test(id)
}

export function encryptSecret(key: Buffer, plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return `${PREFIX}${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ct.toString('base64')}`
}

/** `undefined` nếu không giải mã được (sai khoá / bị sửa). */
export function decryptSecret(key: Buffer, stored: string): string | undefined {
  if (!stored.startsWith(PREFIX)) return undefined
  const [iv, tag, ct] = stored.slice(PREFIX.length).split(':').map(p => Buffer.from(p ?? '', 'base64'))
  if (!iv || !tag || !ct) return undefined
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', key, iv)
    d.setAuthTag(tag)
    return Buffer.concat([d.update(ct), d.final()]).toString('utf8')
  } catch { return undefined }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Kiểm tra hình dạng tối thiểu; nội dung còn lại được lưu nguyên. */
export function validateSnapshot(raw: unknown): ProjectSnapshotDto {
  if (!isObject(raw) || !isObject(raw.project) || !Array.isArray(raw.booths) || !Array.isArray(raw.projectors)) {
    throw new DeviceError('bad-request', 'Body must be { project, booths[], projectors[] }')
  }
  const { id, name } = raw.project
  if (typeof id !== 'string' || !isValidProjectId(id)) throw new DeviceError('bad-request', 'project.id must match [A-Za-z0-9_-]{1,64}')
  if (typeof name !== 'string' || !name.trim()) throw new DeviceError('bad-request', 'project.name is required')
  if (raw.projectors.length > 2000 || raw.projectors.some(p => !isObject(p))) throw new DeviceError('bad-request', 'Invalid projectors')
  return raw as unknown as ProjectSnapshotDto
}

function mapPasswords(snapshot: ProjectSnapshotDto, fn: (pw: string) => string | undefined): ProjectSnapshotDto {
  return {
    ...snapshot,
    projectors: snapshot.projectors.map(p => {
      const protocol = p?.network?.protocol
      if (!protocol || typeof protocol.password !== 'string' || protocol.password === '') return p
      const { password, ...rest } = protocol
      const next = fn(password)
      return { ...p, network: { ...p.network, protocol: next === undefined ? rest : { ...rest, password: next } } }
    }),
  }
}

export interface ProjectStore {
  list(): ProjectSummaryDto[]
  load(id: string): ProjectSnapshotDto | null
  save(snapshot: ProjectSnapshotDto): ProjectSummaryDto
  remove(id: string): boolean
  /** Tài khoản đăng nhập nhanh theo hãng; mật khẩu mã hoá trên đĩa như project. */
  getQuickLogins(): QuickLoginsDto
  setQuickLogins(logins: QuickLoginsDto): void
}

export function createProjectStore(dir: string, keyOverride?: Buffer): ProjectStore {
  const projectsDir = path.join(dir, 'projects')
  fs.mkdirSync(projectsDir, { recursive: true, mode: 0o700 })

  function loadKey(): Buffer {
    if (keyOverride) return keyOverride
    const env = process.env.MIKMASTER_KEY
    if (env) {
      const k = Buffer.from(env, 'base64')
      if (k.length !== 32) throw new Error('MIKMASTER_KEY must be 32 bytes, base64 encoded')
      return k
    }
    const file = path.join(dir, 'secret.key')
    if (fs.existsSync(file)) return Buffer.from(fs.readFileSync(file, 'utf8').trim(), 'base64')
    const k = crypto.randomBytes(32)
    fs.writeFileSync(file, k.toString('base64'), { mode: 0o600 })
    return k
  }
  const key = loadKey()
  const fileOf = (id: string) => path.join(projectsDir, `${id}.json`)
  const quickFile = path.join(dir, 'quick-logins.json')

  function read(id: string): { summary: ProjectSummaryDto; snapshot: ProjectSnapshotDto } | null {
    try { return JSON.parse(fs.readFileSync(fileOf(id), 'utf8')) } catch { return null }
  }

  return {
    list() {
      return fs.readdirSync(projectsDir).filter(f => f.endsWith('.json'))
        .map(f => read(f.slice(0, -5))?.summary).filter((s): s is ProjectSummaryDto => !!s)
        .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    },
    load(id) {
      const entry = read(id)
      return entry ? mapPasswords(entry.snapshot, pw => decryptSecret(key, pw)) : null
    },
    save(snapshot) {
      const summary: ProjectSummaryDto = {
        id: snapshot.project.id, name: snapshot.project.name,
        savedAt: new Date().toISOString(), deviceCount: snapshot.projectors.length,
      }
      const body = JSON.stringify({ summary, snapshot: mapPasswords(snapshot, pw => encryptSecret(key, pw)) })
      const tmp = `${fileOf(snapshot.project.id)}.${process.pid}.tmp`
      fs.writeFileSync(tmp, body, { mode: 0o600 })
      fs.renameSync(tmp, fileOf(snapshot.project.id)) // ghi nguyên tử: mất điện giữa chừng không làm hỏng bản cũ
      return summary
    },
    remove(id) {
      try { fs.unlinkSync(fileOf(id)); return true } catch { return false }
    },
    getQuickLogins() {
      let raw: unknown
      try { raw = JSON.parse(fs.readFileSync(quickFile, 'utf8')) } catch { return {} }
      const out: QuickLoginsDto = {}
      for (const brand of QUICK_LOGIN_BRANDS) {
        const e = isObject(raw) ? raw[brand] : undefined
        if (!isObject(e) || typeof e.username !== 'string' || typeof e.password !== 'string') continue
        const password = e.password === '' ? '' : decryptSecret(key, e.password)
        if (password !== undefined) out[brand] = { username: e.username, password }
      }
      return out
    },
    setQuickLogins(logins) {
      const body: Record<string, { username: string; password: string }> = {}
      for (const brand of QUICK_LOGIN_BRANDS) {
        const e = logins[brand]
        if (e) body[brand] = { username: e.username, password: e.password === '' ? '' : encryptSecret(key, e.password) }
      }
      const tmp = `${quickFile}.${process.pid}.tmp`
      fs.writeFileSync(tmp, JSON.stringify(body), { mode: 0o600 })
      fs.renameSync(tmp, quickFile)
    },
  }
}

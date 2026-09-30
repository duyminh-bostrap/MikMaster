import { WEB_LOGIN_PROTOCOLS, commandBrandOf } from '../../shared/api.ts'
import { getProtocolOption } from '@/constants/protocols'
import type { Projector, ProtocolType } from '@/types'

export interface Credentials {
  username?: string
  password?: string
}

export const needsAuth = (type: ProtocolType): boolean => getProtocolOption(type).auth !== 'None'
/** Điều khiển không cần đăng nhập nhưng có tài khoản web tuỳ chọn (Christie: chỉ cho live preview). */
export const hasWebLogin = (type: ProtocolType): boolean => WEB_LOGIN_PROTOCOLS.includes(type)
/** Giữ tài khoản khi lưu cấu hình mạng. */
export const keepsCredentials = (type: ProtocolType): boolean => needsAuth(type) || hasWebLogin(type)
export const hasCredentials = (p: Projector): boolean => !!(p.network.protocol.username || p.network.protocol.password)

/** Máy cần đăng nhập nhưng chưa có mật khẩu (file project chỉ giữ username, không giữ mật khẩu). */
export const lacksPassword = (p: Projector): boolean => needsAuth(p.network.protocol.type) && !p.network.protocol.password

export function withCredentials(p: Projector, creds: Credentials): Projector {
  return { ...p, network: { ...p.network, protocol: { ...p.network.protocol, username: creds.username || undefined, password: creds.password || undefined } } }
}

/**
 * Điền tài khoản cho máy cần đăng nhập mà chưa có mật khẩu: ưu tiên cache riêng của máy, sau đó tài khoản dùng chung.
 * Không bao giờ ghi đè mật khẩu đã có.
 */
export function fillMissingCredentials(
  projectors: Projector[],
  lookup: { device: (ip: string, port: number) => Credentials | null; shared: () => Credentials | null },
): Projector[] {
  return projectors.map(p => {
    if (!lacksPassword(p)) return p
    const creds = lookup.device(p.network.ip, p.network.protocol.port) ?? lookup.shared()
    return creds && (creds.username || creds.password) ? withCredentials(p, creds) : p
  })
}

/** Một loại máy chiếu (theo hãng) trong bước đăng nhập: mỗi loại có thể dùng tài khoản riêng. */
export interface LoginGroup {
  key: string
  /** Tên hiển thị (Panasonic, Christie…) */
  label: string
  /** Số máy sẽ nhận tài khoản này. */
  count: number
  /** false = tài khoản tuỳ chọn (Christie: chỉ dùng cho live preview). */
  required: boolean
}

const BRAND_LABEL: Record<string, string> = { panasonic: 'Panasonic', christie: 'Christie', barco: 'Barco', pjlink: 'PJLink' }

/** Khoá nhóm đăng nhập: theo hãng khi biết, không thì theo giao thức. */
export const loginGroupKey = (type: ProtocolType): string => commandBrandOf(type) ?? type

/** Máy nào nhận tài khoản của nhóm: cần đăng nhập mà chưa có mật khẩu; hoặc có tài khoản web tuỳ chọn mà chưa nhập gì. */
const takesLogin = (p: Projector): boolean => {
  const type = p.network.protocol.type
  return needsAuth(type) ? lacksPassword(p) : hasWebLogin(type) && !hasCredentials(p)
}

/** Các loại máy đang có trong danh sách (chỉ loại có máy nhận được tài khoản); loại bắt buộc xếp trước. */
export function loginGroups(projectors: Projector[]): LoginGroup[] {
  const groups = new Map<string, LoginGroup>()
  for (const p of projectors) {
    if (!takesLogin(p)) continue
    const type = p.network.protocol.type
    const key = loginGroupKey(type)
    const g = groups.get(key)
    if (g) g.count++
    else groups.set(key, { key, label: BRAND_LABEL[key] ?? getProtocolOption(type).label, count: 1, required: needsAuth(type) })
  }
  return [...groups.values()].sort((a, b) => Number(b.required) - Number(a.required))
}

/** LOGIN & LAUNCH: mỗi loại máy nhận tài khoản của loại đó (ô để trống = bỏ qua). Không ghi đè mật khẩu đã có. */
export function applyLogins(projectors: Projector[], logins: Record<string, Credentials>): Projector[] {
  return projectors.map(p => {
    const creds = logins[loginGroupKey(p.network.protocol.type)]
    return creds && (creds.username || creds.password) && takesLogin(p) ? withCredentials(p, creds) : p
  })
}

export const countMissingLogins = (projectors: Projector[]): number => projectors.filter(lacksPassword).length

/**
 * Máy đang cần đăng nhập mới điều khiển được: đã bị từ chối đăng nhập, hoặc — ở chế độ mô phỏng, khi không
 * hỏi được thiết bị — giao thức có xác thực mà chưa có mật khẩu. Máy không trả lời (mất mạng) KHÔNG tính là cần đăng nhập.
 */
export function loginRequired(p: Projector, live: boolean): boolean {
  if (!needsAuth(p.network.protocol.type)) return false
  if (p.connection === 'auth-failed') return true
  return !live && lacksPassword(p)
}

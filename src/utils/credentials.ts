import { WEB_LOGIN_PROTOCOLS } from '../../shared/api.ts'
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

/** LOGIN & LAUNCH: áp một tài khoản cho mọi máy cần đăng nhập mà chưa có mật khẩu. */
export function applyLoginToMissing(projectors: Projector[], login: Credentials): Projector[] {
  return projectors.map(p => (lacksPassword(p) ? withCredentials(p, login) : p))
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

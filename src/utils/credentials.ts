import { getProtocolOption } from '@/constants/protocols'
import type { Projector, ProtocolType } from '@/types'

export interface Credentials {
  username?: string
  password?: string
}

export const needsAuth = (type: ProtocolType): boolean => getProtocolOption(type).auth !== 'None'
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

import { timingSafeEqual } from 'node:crypto'
import { isPrivateIPv4 } from '../../shared/ipRange.ts'

/**
 * Server mở kết nối TCP tới địa chỉ do client gửi lên — nếu không giới hạn sẽ thành cửa SSRF.
 * Chỉ cho phép dải nội bộ (RFC 1918), link-local và loopback.
 */
export function isAllowedHost(ip: string): boolean {
  return isPrivateIPv4(ip)
}

export function isValidSubnetPrefix(prefix: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(prefix) && isAllowedHost(`${prefix}.1`)
}

export function isLoopbackBind(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1'
}

/** So sánh token theo thời gian không đổi để không lộ độ dài khớp. */
export function tokenMatches(expected: string, given: string | null | undefined): boolean {
  if (!given) return false
  const a = Buffer.from(expected), b = Buffer.from(given)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Lấy token từ `Authorization: Bearer` hoặc `?token=` (EventSource không gửi được header). */
export function extractToken(authorization: string | undefined, url: URL): string | null {
  const m = /^Bearer\s+(.+)$/i.exec(authorization ?? '')
  return m?.[1] ?? url.searchParams.get('token')
}

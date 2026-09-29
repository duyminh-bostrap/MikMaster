import { timingSafeEqual } from 'node:crypto'

/**
 * Server mở kết nối TCP tới địa chỉ do client gửi lên — nếu không giới hạn sẽ thành cửa SSRF.
 * Chỉ cho phép dải nội bộ (RFC 1918), link-local và loopback.
 */
export function isAllowedHost(ip: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip)
  if (!m) return false
  const [a, b, c, d] = m.slice(1).map(Number) as [number, number, number, number]
  if ([a, b, c, d].some(n => n > 255)) return false
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)
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

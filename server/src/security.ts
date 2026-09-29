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

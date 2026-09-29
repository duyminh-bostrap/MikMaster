/** Dải IP để quét: dùng chung cho web (kiểm tra ô nhập) và gateway (kiểm tra request). Không phụ thuộc gì. */

export const MAX_SCAN_ADDRESSES = 1024

export function ipToInt(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip.trim())
  if (!m) return null
  const parts = m.slice(1).map(Number)
  if (parts.some(n => n > 255)) return null
  return ((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!
}

export function intToIp(n: number): string {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}

/** Dải nội bộ (RFC 1918), link-local và loopback — gateway chỉ được chạm tới các địa chỉ này. */
export function isPrivateIPv4(ip: string): boolean {
  const n = ipToInt(ip)
  if (n === null) return false
  const a = n >>> 24, b = (n >>> 16) & 255
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)
}

export type RangeCheck = { ok: true; from: number; to: number; count: number } | { ok: false; error: string }

export function checkScanRange(from: string, to: string): RangeCheck {
  const a = ipToInt(from), b = ipToInt(to)
  if (a === null) return { ok: false, error: 'Start address is not a valid IPv4 address' }
  if (b === null) return { ok: false, error: 'End address is not a valid IPv4 address' }
  if (!isPrivateIPv4(from) || !isPrivateIPv4(to)) return { ok: false, error: 'Only local network addresses (10.x, 172.16–31.x, 192.168.x, 127.x) can be scanned' }
  if (a > b) return { ok: false, error: 'Start address must come before the end address' }
  const count = b - a + 1
  if (count > MAX_SCAN_ADDRESSES) return { ok: false, error: `At most ${MAX_SCAN_ADDRESSES} addresses per scan (this range has ${count})` }
  return { ok: true, from: a, to: b, count }
}

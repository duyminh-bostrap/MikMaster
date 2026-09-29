import { DEFAULT_PORTS, type DriverProtocol, type IdentifyDto } from '../../shared/api.ts'
import { DRIVERS } from './drivers/index.ts'
import type { ProbeResult } from './drivers/types.ts'
import { SCAN_PROTOCOLS } from './scan.ts'

/**
 * Thử mọi giao thức quét được trên một IP (song song, cổng mặc định). Chọn giao thức của hãng nếu có
 * (điều khiển được nhiều hơn PJLink); model / tên lấy từ PJLink (INF2 / NAME) vì các giao thức hãng
 * chưa có lệnh hỏi model đã xác minh.
 */
export async function identifyDevice(
  ip: string,
  creds: { username?: string; password?: string },
  timeoutMs = 1500,
  /** Chỉ để test: cổng khác cổng mặc định. */
  ports: Partial<Record<DriverProtocol, number>> = {},
): Promise<IdentifyDto> {
  const results = await Promise.all(SCAN_PROTOCOLS.map(async protocol => {
    const driver = DRIVERS[protocol]
    const port = ports[protocol] ?? DEFAULT_PORTS[protocol]
    const target = { host: ip, port, timeoutMs, ...creds }
    const r: ProbeResult | null = driver.identify ? await driver.identify(target) : await driver.probe(ip, port, timeoutMs)
    return r ? { protocol, port, ...r } : null
  }))
  const found = results.filter((r): r is NonNullable<typeof r> => r !== null)
  if (found.length === 0) return { found: false }
  const isPjlink = (p: DriverProtocol) => p.startsWith('pjlink')
  const vendor = found.find(r => !isPjlink(r.protocol))
  const pjlink = found.find(r => isPjlink(r.protocol))
  const chosen = vendor ?? pjlink!
  return {
    found: true,
    protocol: chosen.protocol === 'pjlink-class1' ? 'pjlink-class2' : chosen.protocol,
    port: chosen.port,
    manufacturer: vendor?.manufacturer ?? pjlink?.manufacturer,
    model: pjlink?.model ?? vendor?.model,
    name: pjlink?.name,
    authRequired: chosen.authRequired,
  }
}

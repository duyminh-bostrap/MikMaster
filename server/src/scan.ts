import { DEFAULT_PORTS, type DriverProtocol, type ScanFoundDto } from '../../shared/api.ts'
import { intToIp } from '../../shared/ipRange.ts'
import { DRIVERS } from './drivers/index.ts'

/** PJLink Class 1 là tập con mà mọi thiết bị PJLink đều hiểu nên dùng làm nhãn khi quét. */
export const SCAN_PROTOCOLS: readonly DriverProtocol[] = ['pjlink-class1', 'panasonic-nt-control', 'christie-serial-ip']

export interface ScanOptions {
  /** Địa chỉ đầu / cuối dạng số (xem shared/ipRange.ts), đã kiểm tra hợp lệ. */
  from: number
  to: number
  protocols?: readonly DriverProtocol[]
  concurrency?: number
  timeoutMs?: number
  signal?: AbortSignal
  onProgress: (pct: number, ip: string) => void
  onFound: (found: ScanFoundDto) => void
}

export async function scanRange(opts: ScanOptions): Promise<void> {
  const protocols = opts.protocols ?? SCAN_PROTOCOLS
  const timeoutMs = opts.timeoutMs ?? 700
  const total = opts.to - opts.from + 1
  let next = opts.from
  let done = 0

  async function worker(): Promise<void> {
    while (!opts.signal?.aborted) {
      const n = next++
      if (n > opts.to) return
      const ip = intToIp(n)
      await Promise.all(protocols.map(async protocol => {
        const port = DEFAULT_PORTS[protocol]
        const result = await DRIVERS[protocol].probe(ip, port, timeoutMs)
        if (result && !opts.signal?.aborted) opts.onFound({ ip, port, protocol, ...result })
      }))
      done++
      opts.onProgress(Math.round((done / total) * 100), ip)
    }
  }

  await Promise.all(Array.from({ length: opts.concurrency ?? 48 }, worker))
}

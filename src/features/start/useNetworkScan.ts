import { useCallback, useEffect, useRef, useState } from 'react'
import { checkScanRange, intToIp } from '../../../shared/ipRange.ts'
import { MOCK_DISCOVERABLE } from '@/data/mock'
import { useGateway } from '@/store/useGateway'
import type { DiscoveredDevice, ProtocolType } from '@/types'

export type ScanStatus = 'idle' | 'scanning' | 'done'

const TICK_MS = 60
const TOTAL_TICKS = 80

/**
 * Có gateway → quét thật (server thử kết nối cổng PJLink / Panasonic / Christie trên từng IP).
 * Không có → quét giả lập với danh sách mẫu, để app vẫn demo được không cần phần cứng.
 */
export interface ScanRange { from: string; to: string }

/**
 * Giả lập: đặt các máy mẫu rải đều trong dải người dùng chọn, để bản demo tôn trọng dải đó
 * (dải hẹp hơn số máy mẫu thì chỉ có bấy nhiêu máy).
 */
function placeMockDevices(range: ScanRange): Array<DiscoveredDevice & { foundAtPct: number }> {
  const check = checkScanRange(range.from, range.to)
  if (!check.ok) return []
  const n = Math.min(MOCK_DISCOVERABLE.length, check.count)
  return MOCK_DISCOVERABLE.slice(0, n).map((d, i) => {
    const offset = n === 1 ? 0 : Math.round((i * (check.count - 1)) / (n - 1))
    return { ...d, ip: intToIp(check.from + offset), foundAtPct: Math.max(1, Math.round(((offset + 1) / check.count) * 100)) }
  })
}

export function useNetworkScan(range: ScanRange, onFound: (device: DiscoveredDevice) => void) {
  const { gateway } = useGateway()
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [currentIp, setCurrentIp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const cancel = useRef<(() => void) | null>(null)
  const onFoundRef = useRef(onFound)
  useEffect(() => { onFoundRef.current = onFound }, [onFound])

  const stop = useCallback(() => { cancel.current?.(); cancel.current = null }, [])

  const start = useCallback(() => {
    stop()
    setStatus('scanning')
    setProgress(0)
    setError(null)

    if (gateway) {
      cancel.current = gateway.scan(range, {
        onProgress: (pct, ip) => { setProgress(pct); setCurrentIp(ip) },
        onFound: f => onFoundRef.current({ ...f, protocol: f.protocol as ProtocolType }),
        onDone: () => setStatus('done'),
        onError: message => { setError(message); setStatus('done') },
      })
      return
    }

    const pending = placeMockDevices(range)
    const check = checkScanRange(range.from, range.to)
    const first = check.ok ? check.from : 0
    const count = check.ok ? check.count : 1
    let tick = 0
    const timer = setInterval(() => {
      tick++
      const pct = Math.round((tick / TOTAL_TICKS) * 100)
      setProgress(pct)
      setCurrentIp(intToIp(first + Math.min(count - 1, Math.floor((tick / TOTAL_TICKS) * count))))
      while (pending[0] && pending[0].foundAtPct <= pct) onFoundRef.current(pending.shift()!)
      if (tick >= TOTAL_TICKS) { stop(); setStatus('done') }
    }, TICK_MS)
    cancel.current = () => clearInterval(timer)
  }, [gateway, stop, range])

  useEffect(() => stop, [stop]) // dọn khi unmount

  return { status, progress, currentIp, error, start }
}

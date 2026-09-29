import { useCallback, useEffect, useRef, useState } from 'react'
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
export function useNetworkScan(subnet: string, onFound: (device: DiscoveredDevice) => void) {
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
      cancel.current = gateway.scan(subnet, {
        onProgress: (pct, ip) => { setProgress(pct); setCurrentIp(ip) },
        onFound: f => onFoundRef.current({ ...f, protocol: f.protocol as ProtocolType }),
        onDone: () => setStatus('done'),
        onError: message => { setError(message); setStatus('done') },
      })
      return
    }

    const pending = [...MOCK_DISCOVERABLE]
    let tick = 0
    const timer = setInterval(() => {
      tick++
      const pct = Math.round((tick / TOTAL_TICKS) * 100)
      setProgress(pct)
      setCurrentIp(`${subnet}.${Math.max(1, Math.floor((tick / TOTAL_TICKS) * 254))}`)
      while (pending[0] && pending[0].foundAtPct <= pct) onFoundRef.current(pending.shift()!)
      if (tick >= TOTAL_TICKS) { stop(); setStatus('done') }
    }, TICK_MS)
    cancel.current = () => clearInterval(timer)
  }, [gateway, stop, subnet])

  useEffect(() => stop, [stop]) // dọn khi unmount

  return { status, progress, currentIp, error, start }
}

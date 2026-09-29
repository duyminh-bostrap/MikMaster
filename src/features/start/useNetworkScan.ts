import { useCallback, useEffect, useRef, useState } from 'react'
import { MOCK_DISCOVERABLE, type DiscoverableDevice } from '@/data/mock'

export type ScanStatus = 'idle' | 'scanning' | 'done'

const TICK_MS = 60
const TOTAL_TICKS = 80

/**
 * Bộ quét mạng giả lập. Thay phần setInterval bằng lời gọi backend (ping + dò cổng giao thức)
 * khi có; giữ nguyên chữ ký hook.
 */
export function useNetworkScan(subnet: string, onFound: (device: DiscoverableDevice) => void) {
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [currentIp, setCurrentIp] = useState('')
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const onFoundRef = useRef(onFound)
  useEffect(() => { onFoundRef.current = onFound }, [onFound])

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }, [])

  const start = useCallback(() => {
    stop()
    setStatus('scanning')
    setProgress(0)
    const pending = [...MOCK_DISCOVERABLE]
    let tick = 0
    timer.current = setInterval(() => {
      tick++
      const pct = Math.round((tick / TOTAL_TICKS) * 100)
      setProgress(pct)
      setCurrentIp(`${subnet}.${Math.max(1, Math.floor((tick / TOTAL_TICKS) * 254))}`)
      while (pending[0] && pending[0].foundAtPct <= pct) onFoundRef.current(pending.shift()!)
      if (tick >= TOTAL_TICKS) {
        stop()
        setStatus('done')
      }
    }, TICK_MS)
  }, [stop, subnet])

  const reset = useCallback(() => {
    stop()
    setStatus('idle')
    setProgress(0)
  }, [stop])

  useEffect(() => stop, [stop]) // dọn timer khi unmount

  return { status, progress, currentIp, start, reset }
}

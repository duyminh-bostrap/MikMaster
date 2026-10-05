import { useCallback, useRef, useState } from 'react'
import { liveCapabilities } from '@/services/capabilities'
import { isBusy } from './deviceEffects'
import { useProjectActions, useProjectState } from './hooks'
import { useGateway } from './useGateway'

export interface RefreshResult { at: number; ok: number; failed: number; needLogin: number }

/**
 * Đọc lại NGAY trạng thái của mọi máy chiếu trong project (không chờ vòng poll 4 giây): máy đang offline / lỗi giao thức cũng được thử lại.
 * Máy đang bị từ chối đăng nhập KHÔNG được thử lại ở đây (gửi lại mật khẩu sai nhiều lần có thể làm máy khoá cổng điều khiển) —
 * đăng nhập lại ở trang máy đó. Chỉ có tác dụng khi có gateway.
 */
export function useRefreshAll() {
  const { gateway } = useGateway()
  const { projectors } = useProjectState()
  const { syncProjector } = useProjectActions()
  const latest = useRef(projectors)
  latest.current = projectors
  const running = useRef(false)
  const [refreshing, setRefreshing] = useState(false)
  const [result, setResult] = useState<RefreshResult | null>(null)

  const refresh = useCallback(async () => {
    if (!gateway || running.current) return
    running.current = true
    setRefreshing(true)
    try {
      const live = latest.current.filter(p => liveCapabilities(p.network.protocol.type).includes('power'))
      const targets = live.filter(p => p.connection !== 'auth-failed' && !isBusy(p.id))
      let ok = 0, failed = 0
      await Promise.all(targets.map(async p => {
        const r = await gateway.status(p)
        syncProjector(p.id, r.ok ? { ok: true, status: r.value } : { ok: false, code: r.code, message: r.message })
        if (r.ok) ok++; else failed++
      }))
      setResult({ at: Date.now(), ok, failed, needLogin: live.filter(p => p.connection === 'auth-failed').length })
    } finally {
      running.current = false
      setRefreshing(false)
    }
  }, [gateway, syncProjector])

  return { available: gateway !== null, refresh, refreshing, result }
}

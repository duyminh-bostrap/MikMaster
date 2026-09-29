import { useEffect, useRef } from 'react'
import { liveCapabilities } from '@/services/capabilities'
import { isBusy } from './deviceEffects'
import { useProjectActions, useProjectState } from './hooks'
import { useGateway } from './useGateway'

const POLL_MS = 4000

/**
 * Chỉ khi có gateway: đọc trạng thái thật của mọi máy theo chu kỳ (các máy song song, không chồng vòng).
 * Máy bị từ chối xác thực/giao thức (`protocol-error`) bị bỏ qua cho tới khi người dùng Apply cấu hình
 * hoặc bấm Reconnect — tránh gửi lại mật khẩu sai liên tục làm máy chiếu khoá cổng điều khiển.
 */
export function DeviceSync() {
  const { gateway } = useGateway()
  const { projectors, project } = useProjectState()
  const { syncProjector } = useProjectActions()
  const latest = useRef(projectors)
  latest.current = projectors
  const active = gateway !== null && project !== null

  useEffect(() => {
    if (!gateway || !active) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function tick() {
      const targets = latest.current.filter(p => liveCapabilities(p.network.protocol.type).includes('power') && p.connection !== 'protocol-error' && !isBusy(p.id))
      await Promise.all(targets.map(async p => {
        const r = await gateway!.status(p)
        if (cancelled || isBusy(p.id)) return
        syncProjector(p.id, r.ok ? { ok: true, status: r.value } : { ok: false, code: r.code, message: r.message })
      }))
      if (!cancelled) timer = setTimeout(tick, POLL_MS)
    }
    void tick()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [gateway, active, syncProjector])

  return null
}

import { useEffect, useRef, useState } from 'react'
import { previewBrandOf, type PreviewDto } from '../../shared/api.ts'
import { deviceCapabilities } from '@/services/capabilities'
import { useQuickLogins } from '@/services/quickLogins'
import { useGateway } from '@/store/useGateway'
import { usePreshowWanted } from '@/services/preshow'
import { useEdition } from './useEdition'
import { brandOf } from '@/utils/quickLogin'
import { withCredentials } from '@/utils/credentials'
import type { Projector } from '@/types'

export type Live =
  | { kind: 'idle' }
  | { kind: 'ok'; preview: PreviewDto }
  | { kind: 'error'; code: string; message: string }

export interface LivePreview {
  live: Live
  /** Máy có tính năng preview thật (driver hỗ trợ + có gateway). */
  supported: boolean
  /** Máy có preview nhưng đang ở bản Free (preview là tính năng Pro). */
  proLocked: boolean
  /** Máy có Pre-Show (xem ảnh cả khi máy đang tắt): Panasonic, có gateway, bản Pro. */
  preshowCapable: boolean
  /** Đang xem ở chế độ Pre-Show (người dùng đã bật). */
  preshow: boolean
  /** Có tài khoản để đăng nhập web của máy (của máy, hoặc đăng nhập nhanh của hãng). */
  hasAccount: boolean
}

/**
 * Hình trực tiếp từ máy (Christie: qua web của máy). Tài khoản: của chính máy, nếu chưa có thì dùng đăng nhập nhanh của hãng.
 * Máy tắt / mất kết nối → không hỏi. Sai / thiếu tài khoản → dừng hỏi cho tới khi đổi tài khoản
 * (không gửi lại mật khẩu sai liên tục). `intervalMs`: 1000 ở trang máy, chậm hơn ở thẻ trên Dashboard.
 */
export function useLivePreview(p: Projector, intervalMs: number): LivePreview {
  const { gateway } = useGateway()
  const quick = useQuickLogins(gateway)
  const { free } = useEdition()
  const capable = gateway !== null && deviceCapabilities(p).includes('preview')
  const supported = capable && !free
  const own = !!(p.network.protocol.username || p.network.protocol.password)
  const brand = brandOf(p)
  const fallback = !own && brand ? quick[brand] : undefined
  const username = own ? p.network.protocol.username : fallback?.username
  const password = own ? p.network.protocol.password : fallback?.password
  // Christie cần tài khoản web của máy; Panasonic (WebSocket cổng 8080) KHÔNG cần đăng nhập.
  const needsAccount = previewBrandOf(p.network.protocol.type, p.model) === 'christie'
  const hasAccount = !needsAccount || !!(username || password)
  const previewBrand = previewBrandOf(p.network.protocol.type, p.model)
  const preshowCapable = supported && previewBrand === 'panasonic'
  const wanted = usePreshowWanted(p.id)
  const standby = p.power !== 'on' && p.connection === 'connected'
  // Pre-Show: máy đang tắt nhưng người dùng đã bật chế độ → vẫn lấy ảnh (kèm yêu cầu bật Pre-Show).
  const viaPreshow = preshowCapable && wanted && standby
  const on = (p.power === 'on' && p.connection === 'connected') || viaPreshow
  const [live, setLive] = useState<Live>({ kind: 'idle' })
  const latest = useRef(p)
  latest.current = p

  useEffect(() => {
    setLive({ kind: 'idle' })
    if (!gateway || !supported || !on || !hasAccount) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    async function tick() {
      const target = withCredentials(latest.current, { username, password })
      const r = await gateway!.preview(target, viaPreshow ? { preshow: true } : undefined)
      if (cancelled) return
      if (r.ok) setLive({ kind: 'ok', preview: r.value })
      else setLive({ kind: 'error', code: r.code, message: r.message })
      if (!r.ok && r.code === 'auth') return
      timer = setTimeout(tick, intervalMs)
    }
    // Lệch thời điểm bắt đầu giữa các thẻ để không hỏi cùng lúc.
    timer = setTimeout(tick, Math.random() * Math.min(intervalMs, 1500))
    return () => { cancelled = true; clearTimeout(timer) }
  }, [gateway, supported, on, viaPreshow, hasAccount, p.id, p.network.ip, username, password, intervalMs])

  return { live, supported, hasAccount, proLocked: capable && free, preshowCapable, preshow: viaPreshow }
}

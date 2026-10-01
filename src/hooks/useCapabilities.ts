import { deviceCapabilities } from '@/services/capabilities'
import { useCommandOverrides } from '@/services/commandOverrides'
import { useGateway } from '@/store/useGateway'
import type { Projector } from '@/types'

export interface Capabilities {
  /** Đang điều khiển thật (có gateway). */
  live: boolean
  osd: boolean
  testPattern: boolean
  lens: boolean
  brightness: boolean
  input: boolean
  raw: boolean
  /** Có ảnh thật của tín hiệu vào (Christie qua web). Mô phỏng: false (dùng ô mô phỏng). */
  preview: boolean
}

/**
 * Chế độ mô phỏng: mọi thứ khả dụng. Chế độ thật: chỉ những gì driver đã có lệnh xác minh —
 * lens và độ sáng luôn tắt vì chưa có bộ lệnh đã đối chiếu tài liệu hãng (test pattern chỉ bật khi có lệnh).
 */
export function useCapabilities(p: Projector): Capabilities {
  const { gateway } = useGateway()
  useCommandOverrides(gateway) // render lại khi lệnh chung của hãng (trang Nâng cao) đổi
  if (!gateway) return { live: false, osd: true, testPattern: true, lens: true, brightness: true, input: true, raw: false, preview: false }
  const caps = deviceCapabilities(p)
  return { live: true, osd: caps.includes('osd'), testPattern: caps.includes('testPattern'), lens: false, brightness: false, input: caps.includes('input'), raw: caps.includes('raw'), preview: caps.includes('preview') }
}

import { liveCapabilities } from '@/services/capabilities'
import { useGateway } from '@/store/useGateway'
import type { Projector } from '@/types'

export interface Capabilities {
  /** Đang điều khiển thật (có gateway). */
  live: boolean
  osd: boolean
  testPattern: boolean
  lens: boolean
  input: boolean
  raw: boolean
}

/**
 * Chế độ mô phỏng: mọi thứ khả dụng. Chế độ thật: chỉ những gì driver đã có lệnh xác minh —
 * lens và test pattern luôn tắt vì chưa có bộ lệnh đã đối chiếu tài liệu hãng.
 */
export function useCapabilities(p: Projector): Capabilities {
  const { gateway } = useGateway()
  if (!gateway) return { live: false, osd: true, testPattern: true, lens: true, input: true, raw: false }
  const caps = liveCapabilities(p.network.protocol.type)
  return { live: true, osd: caps.includes('osd'), testPattern: false, lens: false, input: caps.includes('input'), raw: caps.includes('raw') }
}

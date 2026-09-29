import { LIVE_CAPABILITIES, effectiveCapabilities, isDriverProtocol, type Capability } from '../../shared/api.ts'
import type { Projector, ProtocolType } from '@/types'

/** Khả năng của driver cho một giao thức (rỗng nếu chưa có driver). Dùng để quyết định có poll trạng thái không. */
export function liveCapabilities(type: ProtocolType): readonly Capability[] {
  return isDriverProtocol(type) ? LIVE_CAPABILITIES[type] : []
}

/** Khả năng thật của một máy cụ thể: như trên, cộng Power / Shutter nếu giao thức chung đã có mẫu lệnh. */
export function deviceCapabilities(p: Projector): readonly Capability[] {
  return effectiveCapabilities(p.network.protocol.type, p.network.protocol.commands)
}

import { LIVE_CAPABILITIES, isDriverProtocol, type Capability } from '../../shared/api.ts'
import type { ProtocolType } from '@/types'

/** Hỗ trợ điều khiển thật của một giao thức (rỗng nếu chưa có driver). */
export function liveCapabilities(type: ProtocolType): readonly Capability[] {
  return isDriverProtocol(type) ? LIVE_CAPABILITIES[type] : []
}

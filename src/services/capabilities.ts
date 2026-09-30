import { LIVE_CAPABILITIES, commandBrandOf, effectiveCapabilities, isDriverProtocol, mergeCommands, type Capability } from '../../shared/api.ts'
import type { Projector, ProtocolType } from '@/types'
import { getCommandOverrides } from './commandOverrides'

/** Khả năng của driver cho một giao thức (rỗng nếu chưa có driver). Dùng để quyết định có poll trạng thái không. */
export function liveCapabilities(type: ProtocolType): readonly Capability[] {
  return isDriverProtocol(type) ? LIVE_CAPABILITIES[type] : []
}

/**
 * Khả năng thật của một máy cụ thể: như trên, cộng Power / Shutter nếu giao thức chung đã có mẫu lệnh,
 * tính cả lệnh chung của hãng khai báo ở trang Nâng cao (lệnh riêng của máy được ưu tiên).
 */
export function deviceCapabilities(p: Projector): readonly Capability[] {
  const type = p.network.protocol.type
  const brand = commandBrandOf(type)
  return effectiveCapabilities(type, mergeCommands(brand ? getCommandOverrides()[brand] : undefined, p.network.protocol.commands))
}

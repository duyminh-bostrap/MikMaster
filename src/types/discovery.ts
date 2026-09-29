import type { ProtocolType } from './protocol'

/** Thiết bị do bộ quét mạng tìm thấy (thật hoặc giả lập). */
export interface DiscoveredDevice {
  ip: string
  port: number
  protocol: ProtocolType
  authRequired: boolean
  name?: string
  manufacturer?: string
  model?: string
  suggestedBoothId?: string
}

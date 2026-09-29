import { createContext } from 'react'
import type { Gateway } from '@/services/gateway'

/** `locked` = có gateway nhưng cần token (gateway chạy với HOST ra mạng / MIKMASTER_TOKEN). */
export type GatewayMode = 'checking' | 'live' | 'simulated' | 'locked'

export interface GatewayState {
  mode: GatewayMode
  gateway: Gateway | null
  /** Token sai (khác với chưa nhập). */
  tokenRejected: boolean
  /** Thử token mới; `true` nếu gateway nhận. */
  unlock: (token: string) => Promise<boolean>
  /** Phát hiện lại gateway (ví dụ vừa chạy `pnpm server`). */
  retry: () => void
  /** Tắt MikMaster (gateway). `true` nếu gateway đã nhận lệnh. */
  quit: () => Promise<boolean>
  /** Người dùng vừa tắt MikMaster từ giao diện. */
  stopped: boolean
}

export const GatewayContext = createContext<GatewayState>({
  mode: 'checking', gateway: null, tokenRejected: false, unlock: async () => false, retry: () => undefined, quit: async () => false, stopped: false,
})

import { createContext } from 'react'
import type { Gateway } from '@/services/gateway'

export type GatewayMode = 'checking' | 'live' | 'simulated'

export interface GatewayState {
  mode: GatewayMode
  gateway: Gateway | null
}

export const GatewayContext = createContext<GatewayState>({ mode: 'checking', gateway: null })

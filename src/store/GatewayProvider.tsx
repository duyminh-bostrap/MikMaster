import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { detectGateway, type Gateway } from '@/services/gateway'
import { GatewayContext, type GatewayState } from './gatewayContext'

export function GatewayProvider({ children }: { children: ReactNode }) {
  const [detected, setDetected] = useState<{ gateway: Gateway | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    void detectGateway().then(gateway => { if (!cancelled) setDetected({ gateway }) })
    return () => { cancelled = true }
  }, [])

  const value = useMemo<GatewayState>(
    () => (detected === null ? { mode: 'checking', gateway: null } : { mode: detected.gateway ? 'live' : 'simulated', gateway: detected.gateway }),
    [detected],
  )
  return <GatewayContext value={value}>{children}</GatewayContext>
}

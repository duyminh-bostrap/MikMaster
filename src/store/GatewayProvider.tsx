import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { detectGateway, saveToken, type Detection } from '@/services/gateway'
import { GatewayContext, type GatewayState } from './gatewayContext'

export function GatewayProvider({ children }: { children: ReactNode }) {
  const [detected, setDetected] = useState<Detection | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    void detectGateway().then(d => { if (!cancelled) setDetected(d) })
    return () => { cancelled = true }
  }, [attempt])

  const unlock = useCallback(async (token: string) => {
    const d = await detectGateway('', token.trim())
    if (d.kind !== 'live') return false
    saveToken(token.trim())
    setDetected(d)
    return true
  }, [])
  const retry = useCallback(() => { setDetected(null); setAttempt(a => a + 1) }, [])

  const value = useMemo<GatewayState>(() => {
    const base = { unlock, retry, tokenRejected: detected?.kind === 'locked' && detected.hadToken }
    if (detected === null) return { ...base, mode: 'checking', gateway: null }
    if (detected.kind === 'live') return { ...base, mode: 'live', gateway: detected.gateway }
    return { ...base, mode: detected.kind === 'locked' ? 'locked' : 'simulated', gateway: null }
  }, [detected, unlock, retry])
  return <GatewayContext value={value}>{children}</GatewayContext>
}

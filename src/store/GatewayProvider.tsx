import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { detectGateway, saveToken, type Detection } from '@/services/gateway'
import { GatewayContext, type GatewayState } from './gatewayContext'

export function GatewayProvider({ children }: { children: ReactNode }) {
  const [detected, setDetected] = useState<Detection | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [stopped, setStopped] = useState(false)

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
  const retry = useCallback(() => { setStopped(false); setDetected(null); setAttempt(a => a + 1) }, [])
  const quit = useCallback(async () => {
    if (detected?.kind !== 'live') return false
    const r = await detected.gateway.quit()
    if (!r.ok) return false
    setStopped(true)
    setDetected({ kind: 'none' })
    return true
  }, [detected])

  const value = useMemo<GatewayState>(() => {
    const base = { unlock, retry, quit, stopped, tokenRejected: detected?.kind === 'locked' && detected.hadToken }
    if (detected === null) return { ...base, mode: 'checking', gateway: null }
    if (detected.kind === 'live') return { ...base, mode: 'live', gateway: detected.gateway }
    return { ...base, mode: detected.kind === 'locked' ? 'locked' : 'simulated', gateway: null }
  }, [detected, unlock, retry, quit, stopped])
  return <GatewayContext value={value}>{children}</GatewayContext>
}

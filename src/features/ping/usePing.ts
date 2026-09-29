import { useCallback, useState } from 'react'
import type { PingDto } from '../../../shared/api.ts'
import { useProjectActions } from '@/store/hooks'
import { useGateway } from '@/store/useGateway'
import type { Projector } from '@/types'

export type PingVerdict = 'ok' | 'port-closed' | 'no-icmp' | 'down'

/** Tóm tắt hai phép thử thành một kết luận cho người vận hành. */
export function pingVerdict(r: PingDto): PingVerdict {
  const port = r.tcp?.ok ?? null
  const icmp = r.icmp?.ok ?? null
  if (port === true) return icmp === false ? 'no-icmp' : 'ok'
  if (port === null) return icmp === false ? 'down' : 'ok'
  return icmp === true ? 'port-closed' : 'down'
}

export const VERDICT_TEXT: Record<PingVerdict, string> = {
  ok: 'Reachable',
  'no-icmp': 'Control port open (device ignores ping)',
  'port-closed': 'On the network, but the control port is closed',
  down: 'No response — check IP, cable, power',
}

function summary(r: PingDto): string {
  const icmp = r.icmp === null ? 'ping n/a' : r.icmp.ok ? `ping ${r.icmp.ms} ms` : 'no ping reply'
  const tcp = r.tcp === null ? 'UDP' : r.tcp.ok ? `port ${r.port} open ${r.tcp.ms} ms` : `port ${r.port}: ${r.tcp.error}`
  return `Ping: ${VERDICT_TEXT[pingVerdict(r)]} (${icmp}, ${tcp})`
}

export function usePing(p: Projector) {
  const { gateway } = useGateway()
  const { logEvent } = useProjectActions()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<PingDto | null>(null)
  const [error, setError] = useState('')

  const run = useCallback(async () => {
    if (!gateway || running) return
    setRunning(true)
    setError('')
    const r = await gateway.ping(p)
    setRunning(false)
    if (r.ok) {
      setResult(r.value)
      logEvent(p.id, pingVerdict(r.value) === 'down' ? 'warn' : 'info', summary(r.value))
    } else {
      setResult(null)
      setError(r.message)
    }
  }, [gateway, running, p, logEvent])

  return { available: gateway !== null, running, result, error, run }
}

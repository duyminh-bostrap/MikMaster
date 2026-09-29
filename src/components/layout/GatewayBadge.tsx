import { Badge } from '@/components/ui/Badge'
import { useGateway } from '@/store/useGateway'

/** Cho người vận hành biết app đang điều khiển máy thật hay chỉ mô phỏng. */
export function GatewayBadge() {
  const { mode } = useGateway()
  if (mode === 'checking') return <Badge>CHECKING GATEWAY…</Badge>
  return mode === 'live'
    ? <Badge tone="ok">LIVE · GATEWAY CONNECTED</Badge>
    : <Badge tone="warn">SIMULATED · NO GATEWAY</Badge>
}

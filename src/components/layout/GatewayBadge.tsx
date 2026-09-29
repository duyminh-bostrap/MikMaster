import { Lock, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { GatewayTokenDialog } from '@/features/gateway/GatewayTokenDialog'
import { useGateway } from '@/store/useGateway'

/** Cho người vận hành biết app đang điều khiển máy thật hay chỉ mô phỏng; bấm để thử lại / nhập token. */
export function GatewayBadge() {
  const { mode, retry } = useGateway()
  const [tokenOpen, setTokenOpen] = useState(false)
  if (mode === 'checking') return <Badge>CHECKING GATEWAY…</Badge>
  if (mode === 'live') return <Badge tone="ok">LIVE · GATEWAY CONNECTED</Badge>
  if (mode === 'locked') {
    return (
      <>
        <button type="button" onClick={() => setTokenOpen(true)} title="Enter the gateway access token">
          <Badge tone="danger"><Lock size={9} className="mr-1 inline" />GATEWAY LOCKED · ENTER TOKEN</Badge>
        </button>
        {tokenOpen && <GatewayTokenDialog onClose={() => setTokenOpen(false)} />}
      </>
    )
  }
  return (
    <button type="button" onClick={retry} title="Look for the gateway again (after starting pnpm server)">
      <Badge tone="warn">SIMULATED · NO GATEWAY <RotateCcw size={9} className="ml-1 inline" /></Badge>
    </button>
  )
}

import { Lock, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { GatewayTokenDialog } from '@/features/gateway/GatewayTokenDialog'
import { useGateway } from '@/store/useGateway'
import { t } from '@/i18n'

/** Cho người vận hành biết app đang điều khiển máy thật hay chỉ mô phỏng; bấm để thử lại / nhập token. */
export function GatewayBadge() {
  const { mode, retry } = useGateway()
  const [tokenOpen, setTokenOpen] = useState(false)
  if (mode === 'checking') return <Badge>{t('CHECKING GATEWAY…')}</Badge>
  if (mode === 'live') return <Badge tone="ok">{t('LIVE · GATEWAY CONNECTED')}</Badge>
  if (mode === 'locked') {
    return (
      <>
        <button type="button" onClick={() => setTokenOpen(true)} title={t('Enter the gateway access token')}>
          <Badge tone="danger"><Lock size={9} className="mr-1 inline" />{t('GATEWAY LOCKED · ENTER TOKEN')}</Badge>
        </button>
        {tokenOpen && <GatewayTokenDialog onClose={() => setTokenOpen(false)} />}
      </>
    )
  }
  return (
    <button type="button" onClick={retry} title={t('Look for the gateway again (after starting pnpm run server)')}>
      <Badge tone="warn">{t('SIMULATED · NO GATEWAY')} <RotateCcw size={9} className="ml-1 inline" /></Badge>
    </button>
  )
}

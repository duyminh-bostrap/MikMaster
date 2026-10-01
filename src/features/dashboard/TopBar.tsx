import { EthernetStatus } from '@/components/ui/EthernetStatus'
import { StatusDot } from '@/components/ui/StatusDot'
import { useClock } from '@/hooks/useClock'
import { RefreshAllButton } from './RefreshAllButton'
import { formatClock } from '@/utils/format'
import type { ConnectionStats } from '@/utils/fleet'
import type { FleetStats } from '@/utils/fleet'
import { cn } from '@/utils/cn'
import { t } from '@/i18n'

export function TopBar({ scopeLabel, unitCount, stats, connection }: { scopeLabel: string; unitCount: number; stats: FleetStats; connection: ConnectionStats }) {
  const now = useClock()
  const all = connection.disconnected === 0
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
      <span className="font-mono text-xs tracking-[0.05em] text-muted-foreground">
        {scopeLabel.toUpperCase()} — {t('{n} UNITS', { n: unitCount })}
      </span>
      <div className="flex items-center gap-4 font-mono text-xs">
        {stats.alerts > 0 && (
          <span className="flex items-center gap-1.5 text-danger">
            <StatusDot tone="danger" className="size-1.5" />
            {t('{n} ALERT(S)', { n: stats.alerts })}
          </span>
        )}
        {/* Số máy đã kết nối: ngay bên trái đồng hồ hệ thống. */}
        <span data-testid="top-connected" className={cn('flex items-center gap-1.5', all ? 'text-ok' : 'text-warn')} title={t('Connected projectors')}>
          <EthernetStatus lost={connection.connected === 0 && connection.total > 0} size={15} label={t('Connected projectors')} className={all ? undefined : 'text-warn'} />
          <span className="tabular-nums">{connection.connected}/{connection.total}</span>
          <span className="text-muted-foreground">{t('CONNECTED')}</span>
        </span>
        {/* Nút làm mới: ngay sau nút kết nối. */}
        <RefreshAllButton />
        <div className="h-4 w-px bg-border" />
        <span className="tabular-nums text-muted-foreground">{formatClock(now)}</span>
      </div>
    </header>
  )
}

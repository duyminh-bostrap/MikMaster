import { StatusDot } from '@/components/ui/StatusDot'
import { useClock } from '@/hooks/useClock'
import { formatClock } from '@/utils/format'
import type { FleetStats } from '@/utils/fleet'
import { t } from '@/i18n'

export function TopBar({ scopeLabel, unitCount, stats }: { scopeLabel: string; unitCount: number; stats: FleetStats }) {
  const now = useClock()
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
        <div className="h-4 w-px bg-border" />
        <span className="tabular-nums text-muted-foreground">{formatClock(now)}</span>
      </div>
    </header>
  )
}

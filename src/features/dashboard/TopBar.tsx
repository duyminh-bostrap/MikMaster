import { StatusDot } from '@/components/ui/StatusDot'
import { useClock } from '@/hooks/useClock'
import { formatClock } from '@/utils/format'
import type { FleetStats } from '@/utils/fleet'

export function TopBar({ scopeLabel, unitCount, stats }: { scopeLabel: string; unitCount: number; stats: FleetStats }) {
  const now = useClock()
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
      <span className="font-mono text-xs tracking-[0.05em] text-muted-foreground">
        {scopeLabel.toUpperCase()} — {unitCount} UNITS
      </span>
      <div className="flex items-center gap-4 font-mono text-xs">
        <span className="flex items-center gap-1.5 text-ok">
          <StatusDot tone="ok" pulse className="size-1.5" />
          {stats.online}/{stats.total} ONLINE
        </span>
        {stats.alerts > 0 && (
          <span className="flex items-center gap-1.5 text-danger">
            <StatusDot tone="danger" className="size-1.5" />
            {stats.alerts} ALERT{stats.alerts > 1 ? 'S' : ''}
          </span>
        )}
        <div className="h-4 w-px bg-border" />
        <span className="tabular-nums text-muted-foreground">{formatClock(now)}</span>
      </div>
    </header>
  )
}

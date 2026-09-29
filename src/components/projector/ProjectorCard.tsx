import { Ban, Power } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { Badge } from '@/components/ui/Badge'
import { PowerDot } from '@/components/ui/StatusDot'
import { cn } from '@/utils/cn'
import { formatHours } from '@/utils/format'
import { getProtocolOption } from '@/constants/protocols'
import type { Projector } from '@/types'
import { PreviewScreen } from './PreviewScreen'
import { TempBar } from './TempBar'

const POWER_LABEL = { on: 'ON', standby: 'OFF', off: 'OFF' } as const

interface ProjectorCardProps {
  projector: Projector
  onOpen: () => void
  onTogglePower: () => void
  onToggleShutter: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  dragProps?: React.HTMLAttributes<HTMLElement> & { draggable?: boolean }
}

export function ProjectorCard({ projector: p, onOpen, onTogglePower, onToggleShutter, onContextMenu, dragProps }: ProjectorCardProps) {
  const hasError = p.errors.length > 0

  function handleKey(e: KeyboardEvent) {
    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onOpen()
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open control for ${p.name}`}
      onClick={onOpen}
      onKeyDown={handleKey}
      onContextMenu={onContextMenu}
      {...dragProps}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-sm border bg-card outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60',
        hasError ? 'border-danger/25 shadow-[0_0_0_1px_rgb(239_68_68/0.13)]' : 'border-border hover:border-primary/30',
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <PowerDot power={p.power} />
          <span className="shrink-0 whitespace-nowrap font-mono text-xs font-medium text-muted-foreground">{p.id}</span>
          <span className="truncate font-mono text-xs text-accent/60">{p.network.ip}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {p.connection === 'protocol-error' && <Badge tone="danger">PROTOCOL</Badge>}
          {hasError && <Badge tone="danger">{p.errors[0]}</Badge>}
          {p.shutter && <Badge tone="warn">SHUTTER</Badge>}
          {p.testPattern.enabled && <Badge tone="accent">PATTERN</Badge>}
        </div>
      </div>

      <PreviewScreen projector={p} size="sm" />

      <div className="flex flex-col gap-1 border-t border-border px-3 py-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-foreground">{p.name}</span>
          <span className="font-mono text-xs text-muted-foreground">{formatHours(p.telemetry.lampHours)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{p.location}</span>
          <span className="shrink-0 font-mono text-[10px]">{getProtocolOption(p.network.protocol.type).label} · {p.input}</span>
        </div>
        <TempBar tempC={p.telemetry.temperatureC} />
      </div>

      <div className="flex border-t border-border">
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onTogglePower() }}
          className={cn('flex flex-1 items-center justify-center gap-1 border-r border-border py-1.5 font-mono text-xs font-medium', p.power === 'on' ? 'text-ok' : 'text-muted-foreground')}
        >
          <Power size={10} strokeWidth={2} />
          {POWER_LABEL[p.power]}
        </button>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onToggleShutter() }}
          className={cn('flex flex-1 items-center justify-center gap-1 py-1.5 font-mono text-xs font-medium', p.shutter ? 'text-warn' : 'text-muted-foreground')}
        >
          <Ban size={10} strokeWidth={2} />
          {p.shutter ? 'CLOSED' : 'OPEN'}
        </button>
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] border border-primary/20 bg-primary/[0.03] opacity-0 transition-opacity group-hover:opacity-100">
        <span className="font-mono text-xs tracking-[0.08em] text-primary">OPEN CONTROL →</span>
      </div>
    </article>
  )
}

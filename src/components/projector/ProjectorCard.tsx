import { Eye, EyeOff, Moon, Power } from 'lucide-react'
import { useT } from '@/i18n'
import type { KeyboardEvent } from 'react'
import { Badge } from '@/components/ui/Badge'
import { PowerDot } from '@/components/ui/StatusDot'
import { cn } from '@/utils/cn'
import { formatHours } from '@/utils/format'
import { powerDisplay } from '@/utils/projector'
import { TEMP_DANGER, TEMP_WARN, TONE_TEXT } from '@/utils/tones'
import type { Projector } from '@/types'
import { ProjectorThumb } from './ProjectorThumb'
import { TempBar } from './TempBar'

interface ProjectorCardProps {
  projector: Projector
  onOpen: () => void
  onPowerOn: () => void
  onPowerOff: () => void
  onToggleShutter: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  dragProps?: React.HTMLAttributes<HTMLElement> & { draggable?: boolean }
}

function CardButton({ label, active, activeClass, hoverClass, onClick, last, children }: {
  label: string
  active: boolean
  activeClass: string
  hoverClass: string
  onClick: () => void
  last?: boolean
  children: React.ReactNode
}) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={active} onClick={e => { e.stopPropagation(); onClick() }}
      className={cn('flex flex-1 items-center justify-center py-2 transition-colors', !last && 'border-r border-border', active ? activeClass : `text-muted-foreground ${hoverClass}`)}>
      {children}
    </button>
  )
}

export const CARD_PREVIEW_MS = 3000

type BarState = 'on' | 'warmup' | 'cooling' | 'off' | 'offline' | 'login'

function barState(p: Projector): BarState {
  if (p.connection === 'auth-failed') return 'login'
  if (p.connection !== 'connected') return 'offline'
  return p.power === 'on' ? 'on' : p.power === 'warmup' ? 'warmup' : p.power === 'cooling' ? 'cooling' : 'off'
}

const STATUS_BAR: Record<BarState, string> = {
  on: 'border-b-ok/30 border-l-ok bg-ok/15',
  warmup: 'border-b-warn/30 border-l-warn bg-warn/15',
  cooling: 'border-b-accent/30 border-l-accent bg-accent/15',
  off: 'border-b-border border-l-off bg-muted',
  offline: 'border-b-danger/30 border-l-danger bg-danger/10',
  login: 'border-b-warn/30 border-l-warn bg-warn/10',
}

export function ProjectorCard({ projector: p, onOpen, onPowerOn, onPowerOff, onToggleShutter, onContextMenu, dragProps }: ProjectorCardProps) {
  const t = useT()
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
      {/* Thanh trạng thái: màu theo bật / tắt / mất kết nối để nhìn lướt cả lưới là biết. */}
      <div className={cn('flex items-center justify-between border-b border-l-4 px-3 py-2', STATUS_BAR[barState(p)])}>
        <div className="flex min-w-0 items-center gap-2">
          <PowerDot power={p.power} />
          <span className="shrink-0 whitespace-nowrap font-mono text-xs font-medium text-muted-foreground">{p.id}</span>
          <span className="truncate font-mono text-xs text-accent/60">{p.network.ip}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {/* Chữ trạng thái nguồn: ON / WARMING UP / COOLING DOWN / OFF (chỉ khi đang liên lạc được với máy). */}
          {p.connection === 'connected' && <span data-testid="power-label" className={cn('font-mono text-[10px] font-bold tracking-[0.08em]', TONE_TEXT[powerDisplay(p.power).tone])}>{t(powerDisplay(p.power).label)}</span>}
          {p.connection === 'protocol-error' && <Badge tone="danger">{t('PROTOCOL')}</Badge>}
          {p.connection === 'auth-failed' && <Badge tone="warn">{t('LOGIN')}</Badge>}
          {hasError && <Badge tone="danger">{p.errors[0]}</Badge>}
          {p.connection === 'connected' && p.telemetry.temperatureC > TEMP_WARN && <Badge tone={p.telemetry.temperatureC > TEMP_DANGER ? 'danger' : 'warn'}>⚠ {p.telemetry.temperatureC}°C</Badge>}
          {p.shutter && <Badge tone="warn">{t('SHUTTER')}</Badge>}
          {p.testPattern.enabled && <Badge tone="accent">{t('PATTERN')}</Badge>}
        </div>
      </div>

      {/* Thumbnail thật; chậm hơn trang máy để nhiều thẻ không hỏi dồn dập. */}
      <ProjectorThumb projector={p} intervalMs={CARD_PREVIEW_MS} />

      <div className="flex flex-col gap-1 border-t border-border px-3 py-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-foreground">{p.name}</span>
          <span className="font-mono text-xs text-muted-foreground">{formatHours(p.telemetry.lampHours)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{p.model}</span>
          <span className="shrink-0 font-mono text-[10px]">{p.input}</span>
        </div>
        <TempBar tempC={p.telemetry.temperatureC} />
      </div>

      {/* Nút icon: bật (trái), tắt (phải), shutter. Nút đúng trạng thái hiện tại được tô; ý nghĩa ở tooltip. */}
      <div className="flex border-t border-border">
        <CardButton label={t('Turn on')} active={p.power === 'on' || p.power === 'warmup'} activeClass="bg-ok/15 text-ok" hoverClass="hover:text-ok" onClick={onPowerOn}><Power size={14} /></CardButton>
        <CardButton label={t('Turn off')} active={p.power !== 'on' && p.power !== 'warmup'} activeClass="bg-muted text-foreground" hoverClass="hover:text-foreground" onClick={onPowerOff}><Moon size={14} /></CardButton>
        <CardButton label={p.shutter ? t('Open the shutter') : t('Close the shutter')} active={p.shutter} activeClass="bg-warn/15 text-warn" hoverClass="hover:text-warn" onClick={onToggleShutter} last>
          {p.shutter ? <EyeOff size={14} /> : <Eye size={14} />}
        </CardButton>
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] border border-primary/20 bg-primary/[0.03] opacity-0 transition-opacity group-hover:opacity-100">
        <span className="font-mono text-xs tracking-[0.08em] text-primary">{t('OPEN CONTROL →')}</span>
      </div>
    </article>
  )
}

import type { KeyboardEvent } from 'react'
import { Badge } from '@/components/ui/Badge'
import { EthernetStatus } from '@/components/ui/EthernetStatus'
import { useT } from '@/i18n'
import type { Projector } from '@/types'
import { cn } from '@/utils/cn'
import { monitorStatus } from '@/utils/monitor'
import { TONE_TEXT, temperatureTone } from '@/utils/tones'
import { CARD_PREVIEW_MS } from './ProjectorCard'
import { ProjectorThumb } from './ProjectorThumb'

const BORDER = { ok: 'border-ok/50', warn: 'border-warn/50', danger: 'border-danger/50', accent: 'border-accent/50', off: 'border-border' } as const

/**
 * Ô gọn của một máy khi group được thu gọn: chỉ hiện hình preview; trỏ chuột (hoặc focus bàn phím) vào mới hiện thông tin máy đó
 * (tên, IP, trạng thái, kết nối, nhiệt độ). Bấm để mở trang máy.
 */
export function CompactTile({ projector: p, onOpen, onContextMenu, dragProps }: {
  projector: Projector
  onOpen: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  dragProps?: React.HTMLAttributes<HTMLElement> & { draggable?: boolean }
}) {
  const t = useT()
  const st = monitorStatus(p)
  const lost = p.connection === 'disconnected' || p.connection === 'protocol-error'
  const c = p.telemetry.temperatureC
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }
  return (
    <div role="button" tabIndex={0} data-testid="compact-tile" data-projector={p.id} aria-label={`Open control for ${p.name}`}
      onClick={onOpen} onKeyDown={onKey} onContextMenu={onContextMenu} {...dragProps}
      className={cn('group relative cursor-pointer overflow-hidden rounded-sm border bg-black outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/60', BORDER[st.tone])}>
      <ProjectorThumb projector={p} intervalMs={CARD_PREVIEW_MS} />
      <div data-testid="compact-info"
        className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-0.5 bg-gradient-to-t from-black/90 via-black/60 to-black/10 p-2 font-mono text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-xs font-semibold" title={p.name}>{p.name}</span>
          <EthernetStatus lost={lost} size={13} label={lost ? t('Disconnected') : t('Connected')} />
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-white/70">{p.id} · {p.network.ip}</span>
          <span className={cn('shrink-0 font-bold', c > 0 ? TONE_TEXT[temperatureTone(c)] : 'text-white/50')}>{c > 0 ? `${c}°C` : '—'}</span>
        </span>
        <span><Badge tone={st.tone}>{t(st.label)}</Badge></span>
      </div>
    </div>
  )
}

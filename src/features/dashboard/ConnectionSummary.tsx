import { Moon, Power } from 'lucide-react'
import type { ReactNode } from 'react'
import { EthernetStatus } from '@/components/ui/EthernetStatus'
import { useT } from '@/i18n'
import type { Projector } from '@/types'
import { cn } from '@/utils/cn'
import { connectionStats } from '@/utils/fleet'
import type { StatusFilter } from '@/utils/projectorFilter'

function Tile({ testId, active, tone, icon, value, label, note, onClick }: {
  testId: string; active: boolean; tone: 'ok' | 'off' | 'danger' | 'accent'; icon: ReactNode; value: ReactNode; label: string; note?: string; onClick: () => void
}) {
  const border = { ok: 'border-ok/40', off: 'border-border', danger: 'border-danger/50', accent: 'border-accent/40' }[tone]
  const text = { ok: 'text-ok', off: 'text-foreground', danger: 'text-danger', accent: 'text-accent' }[tone]
  return (
    <button type="button" data-testid={testId} aria-pressed={active} onClick={onClick}
      className={cn('flex min-w-0 flex-1 items-center gap-3 rounded-sm border bg-card px-4 py-2.5 text-left transition-colors hover:bg-muted', border, active && 'ring-2 ring-primary/50')}>
      <span className={cn('shrink-0', text)}>{icon}</span>
      <span className="flex min-w-0 flex-col">
        <span className={cn('font-mono text-2xl leading-none font-bold tabular-nums', text)}>{value}</span>
        <span className="mt-1 truncate font-mono text-[10px] tracking-[0.1em] text-muted-foreground">{label}</span>
        {note && <span className="truncate font-mono text-[10px] text-warn">{note}</span>}
      </span>
    </button>
  )
}

/**
 * Thanh tóm tắt ở đầu trang All / từng group: bao nhiêu máy ĐÃ KẾT NỐI, bao nhiêu BẬT, bao nhiêu TẮT / chờ, bao nhiêu MẤT KẾT NỐI.
 * Mỗi máy rơi đúng một nhóm (bật + tắt = kết nối; kết nối + mất kết nối = tổng). Bấm một ô để lọc danh sách theo nhóm đó.
 */
export function ConnectionSummary({ projectors, status, onFilter }: { projectors: Projector[]; status: StatusFilter; onFilter: (f: StatusFilter) => void }) {
  const t = useT()
  const s = connectionStats(projectors)
  const toggle = (f: StatusFilter) => onFilter(status === f ? 'all' : f)
  return (
    <div role="group" aria-label={t('Connection summary')} data-testid="connection-summary" className="flex shrink-0 flex-wrap gap-3 border-b border-border bg-background px-5 py-3">
      <Tile testId="summary-connected" active={false} tone="ok" icon={<EthernetStatus lost={false} size={26} label={t('Connected')} />} value={<>{s.connected}<span className="text-base text-muted-foreground">/{s.total}</span></>} label={t('CONNECTED')} onClick={() => onFilter('all')} />
      <Tile testId="summary-on" active={status === 'on'} tone="ok" icon={<Power size={26} strokeWidth={2.25} />} value={s.on} label={t('POWER ON')} onClick={() => toggle('on')} />
      <Tile testId="summary-off" active={status === 'off'} tone="off" icon={<Moon size={26} strokeWidth={2.25} />} value={s.off} label={t('OFF / STANDBY')} onClick={() => toggle('off')} />
      <Tile testId="summary-lost" active={status === 'offline'} tone={s.disconnected > 0 ? 'danger' : 'off'} icon={<EthernetStatus lost={s.disconnected > 0} size={26} label={t('Disconnected')} className={s.disconnected > 0 ? undefined : 'text-muted-foreground'} />}
        value={s.disconnected} label={t('DISCONNECTED')} note={s.needLogin > 0 ? t('{n} need a login', { n: s.needLogin }) : undefined} onClick={() => toggle('offline')} />
    </div>
  )
}

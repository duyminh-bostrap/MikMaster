import { useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Panel } from '@/components/ui/Panel'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useClock } from '@/hooks/useClock'
import { useT } from '@/i18n'
import type { Booth, Projector } from '@/types'
import { cn } from '@/utils/cn'
import { formatClock, formatDuration } from '@/utils/format'
import { activeErrors, brightnessRows, logRows, monitorStatus, onTimeRows, statusRows, temperatureRows, type LogFilter } from '@/utils/monitor'
import { TONE_TEXT, temperatureTone } from '@/utils/tones'

const LEVEL_TONE = { info: 'text-muted-foreground', warn: 'text-warn', error: 'text-danger' } as const
const MAX_TEMP = 90
const TH = 'px-3 py-1.5 text-left font-mono text-[10px] font-normal tracking-[0.1em] text-muted-foreground'
const TD = 'px-3 py-1.5 align-middle'

/** Bảng nhỏ: tiêu đề cột + hàng bấm được (mở máy). */
function Table({ head, children, caption }: { head: string[]; children: ReactNode; caption: string }) {
  return (
    <div className="max-h-72 overflow-y-auto">
      <table className="w-full border-collapse font-mono text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-card"><tr className="border-b border-border">{head.map(h => <th key={h} scope="col" className={TH}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

const Note = ({ children }: { children: ReactNode }) => <p className="border-t border-border px-3 py-1.5 font-mono text-[10px] text-muted-foreground">{children}</p>
const Aside = ({ children }: { children: ReactNode }) => <span className="font-mono text-[10px] text-muted-foreground">{children}</span>

/**
 * View "Dashboard" của tab All: các bảng theo dõi theo thông số của mọi máy (đang lọc) — nhiệt độ, độ sáng,
 * thời gian bật (tính từ lúc bật bằng phần mềm), trạng thái, và nhật ký / lỗi. Bấm một hàng để mở trang máy.
 */
export function MonitorView({ projectors, booths, emptyText, onOpen }: {
  projectors: Projector[]
  booths: Booth[]
  emptyText: string
  onOpen: (id: string) => void
}) {
  const t = useT()
  const now = useClock(30_000).getTime()
  const [logFilter, setLogFilter] = useState<LogFilter>('issues')
  const group = (p: Projector) => booths.find(b => b.id === p.boothId)?.name ?? ''

  if (projectors.length === 0) {
    return <div className="flex h-full items-center justify-center"><span className="font-mono text-sm text-muted-foreground">{emptyText}</span></div>
  }

  const temp = temperatureRows(projectors)
  const bright = brightnessRows(projectors)
  const onTime = onTimeRows(projectors, now)
  const status = statusRows(projectors)
  const logs = logRows(projectors, logFilter)
  const errors = activeErrors(projectors)

  const Row = ({ p, children }: { p: Projector; children: ReactNode }) => (
    <tr tabIndex={0} onClick={() => onOpen(p.id)} onKeyDown={e => { if (e.key === 'Enter') onOpen(p.id) }}
      className="cursor-pointer border-b border-border/60 transition-colors outline-none last:border-0 hover:bg-muted focus-visible:bg-muted">
      <td className={TD}><span className="font-semibold text-foreground">{p.name}</span><span className="ml-2 text-[10px] text-muted-foreground">{p.id}</span><span className="block text-[10px] text-muted-foreground">{group(p)}</span></td>
      {children}
    </tr>
  )

  return (
    <div className="grid grid-cols-2 gap-4 max-xl:grid-cols-1" data-testid="monitor">
      <Panel title={t('TEMPERATURE')} className="min-w-0" bodyClassName="p-0"
        aside={<Aside>{temp.rows.length > 0 ? t('avg {avg}°C · max {max}°C', { avg: temp.avg, max: temp.max }) : '—'}</Aside>}>
        <Table caption={t('TEMPERATURE')} head={[t('PROJECTOR'), t('TEMP')]}>
          {temp.rows.map(p => {
            const c = p.telemetry.temperatureC, tone = temperatureTone(c)
            return <Row key={p.id} p={p}><td className={cn(TD, 'w-1/2')}><div className="flex items-center gap-2"><ProgressBar value={Math.min((c / MAX_TEMP) * 100, 100)} tone={tone} className="flex-1" /><span className={cn('w-10 text-right', TONE_TEXT[tone])}>{c}°C</span></div></td></Row>
          })}
        </Table>
        {temp.rows.length === 0 && <Note>{t('No projector reports a temperature.')}</Note>}
        {temp.missing > 0 && temp.rows.length > 0 && <Note>{t('{n} projector(s) report no temperature', { n: temp.missing })}</Note>}
      </Panel>

      <Panel title={t('BRIGHTNESS')} className="min-w-0" bodyClassName="p-0"
        aside={<Aside>{bright.rows.length > 0 ? t('avg {avg}%', { avg: bright.avg }) : '—'}</Aside>}>
        <Table caption={t('BRIGHTNESS')} head={[t('PROJECTOR'), t('BRIGHTNESS')]}>
          {bright.rows.map(p => (
            <Row key={p.id} p={p}><td className={cn(TD, 'w-1/2')}><div className="flex items-center gap-2"><ProgressBar value={p.telemetry.brightness} tone="accent" className="flex-1" /><span className="w-10 text-right text-foreground">{p.telemetry.brightness}%</span></div></td></Row>
          ))}
        </Table>
        {bright.rows.length === 0 && <Note>{t('No projector is on.')}</Note>}
        {bright.off > 0 && bright.rows.length > 0 && <Note>{t('{n} projector(s) are not on', { n: bright.off })}</Note>}
      </Panel>

      <Panel title={t('TIME SINCE POWER ON')} className="min-w-0" bodyClassName="p-0"
        aside={<Aside>{onTime.rows.length > 0 ? t('longest {d}', { d: formatDuration(onTime.longest) }) : '—'}</Aside>}>
        <Table caption={t('TIME SINCE POWER ON')} head={[t('PROJECTOR'), t('ON FOR'), t('SINCE')]}>
          {onTime.rows.map(r => (
            <Row key={r.projector.id} p={r.projector}>
              <td className={cn(TD, 'text-foreground')}>{formatDuration(r.ms)}</td>
              <td className={cn(TD, 'text-muted-foreground')}>{formatClock(new Date(r.since))}</td>
            </Row>
          ))}
        </Table>
        {onTime.rows.length === 0 && <Note>{t('No projector has been switched on since MikMaster started watching it.')}</Note>}
        {onTime.off > 0 && onTime.rows.length > 0 && <Note>{t('{n} projector(s) are not on', { n: onTime.off })}</Note>}
      </Panel>

      <Panel title={t('STATUS')} className="min-w-0" bodyClassName="p-0"
        aside={<Aside>{t('{on} on · {off} off · {bad} need attention', { on: status.counts.on, off: status.counts.standby + status.counts.off, bad: status.counts.login + status.counts.offline + status.counts.error })}</Aside>}>
        <Table caption={t('STATUS')} head={[t('PROJECTOR'), t('STATUS'), t('INPUT'), '']}>
          {status.rows.map(p => {
            const s = monitorStatus(p)
            return (
              <Row key={p.id} p={p}>
                <td className={TD}><Badge tone={s.tone}>{t(s.label)}</Badge></td>
                <td className={cn(TD, 'text-muted-foreground')}>{p.power === 'on' ? p.input : '—'}</td>
                <td className={TD}><span className="flex gap-1">{p.shutter && <Badge tone="warn">{t('SHUTTER')}</Badge>}{p.testPattern.enabled && <Badge tone="accent">{t('PATTERN')}</Badge>}</span></td>
              </Row>
            )
          })}
        </Table>
      </Panel>

      <Panel title={t('LOG & ERRORS')} className="col-span-2 min-w-0 max-xl:col-span-1" bodyClassName="p-0"
        aside={
          <div role="radiogroup" aria-label={t('Log filter')} className="flex gap-1">
            {([['issues', 'Warnings + errors'], ['errors', 'Errors'], ['all', 'All events']] as const).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={logFilter === v} onClick={() => setLogFilter(v)}
                className={cn('rounded-sm border px-2 py-0.5 font-mono text-[10px] transition-colors', logFilter === v ? 'border-accent/50 bg-accent/10 text-accent' : 'border-transparent text-muted-foreground hover:text-foreground')}>{t(label)}</button>
            ))}
          </div>
        }>
        {errors.length > 0 && (
          <div className="border-b border-border bg-danger/5 px-3 py-2 font-mono text-xs" aria-label={t('Active errors')}>
            <p className="mb-1 text-[10px] tracking-[0.1em] text-danger">{t('ACTIVE ERRORS')} · {errors.length}</p>
            {errors.map(e => (
              <button key={e.projector.id} type="button" onClick={() => onOpen(e.projector.id)} className="block w-full text-left hover:underline">
                <span className="font-semibold text-foreground">{e.projector.name}</span> <span className="text-danger">{e.errors.join(', ')}</span>
              </button>
            ))}
          </div>
        )}
        <div className="max-h-72 overflow-y-auto px-3 py-2 font-mono text-xs leading-snug">
          {logs.length === 0 && <p className="text-muted-foreground">{t('No events')}</p>}
          {logs.map(r => (
            <button key={`${r.projector.id}:${r.entry.id}`} type="button" onClick={() => onOpen(r.projector.id)} className="block w-full text-left hover:bg-muted">
              <span className="text-muted-foreground">{formatClock(new Date(r.entry.at))} </span>
              <span className="text-foreground">{r.projector.name} </span>
              <span className={LEVEL_TONE[r.entry.level]}>{r.entry.message}</span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  )
}

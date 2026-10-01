import { FlaskConical } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { LineChart, seriesColor } from '@/components/charts/LineChart'
import { useClock } from '@/hooks/useClock'
import { useT } from '@/i18n'
import { eventsOf, historyOf, useHistoryVersion } from '@/services/telemetryHistory'
import type { Booth, Projector } from '@/types'
import { cn } from '@/utils/cn'
import { formatClock, formatDuration } from '@/utils/format'
import { sampleData } from '@/utils/sampleData'
import { activeErrors, brightnessRows, logRows, monitorStatus, onTimeRows, statusRows, temperatureRows, timeline, type LogFilter } from '@/utils/monitor'
import { TONE_TEXT, temperatureTone } from '@/utils/tones'

const LEVEL_TONE = { info: 'text-muted-foreground', warn: 'text-warn', error: 'text-danger' } as const
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
export function MonitorView({ projectors: real, booths, emptyText, onOpen }: {
  projectors: Projector[]
  booths: Booth[]
  emptyText: string
  onOpen: (id: string) => void
}) {
  const t = useT()
  const now = useClock(30_000).getTime()
  // Dữ liệu mẫu (chỉ để xem thử): thay máy thật bằng máy mẫu cho toàn bộ Dashboard; không ghi vào project hay lịch sử thật.
  const [sample, setSample] = useState(false)
  const sampleSet = useMemo(() => (sample ? sampleData(real, now) : null), [sample, real, now])
  const projectors = sampleSet?.projectors ?? real
  const history = (id: string) => (sampleSet ? sampleSet.history.get(id) ?? [] : historyOf(id))
  const powerEvents = (id: string) => (sampleSet ? sampleSet.events.get(id) ?? [] : eventsOf(id))
  const [logFilter, setLogFilter] = useState<LogFilter>('issues')
  useHistoryVersion() // vẽ lại khi có mẫu nhiệt độ mới
  const [focus, setFocus] = useState<string | null>(null) // máy đang được nhấn mạnh (rê chuột vào đường hoặc vào khung màu)
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

  // Màu theo thứ tự máy trong danh sách.
  const colorOf = (p: Projector) => seriesColor(Math.max(0, projectors.findIndex(x => x.id === p.id)))
  // Trục thời gian thật, gốc = lúc máy đầu tiên được xác nhận bật. Mỗi máy: các lần bật (▲) / tắt (■) và nhiệt độ trong lúc bật.
  const tl = timeline(projectors, history, powerEvents, now)
  const chartSeries = (tl?.series ?? []).map(sr => ({
    id: sr.projector.id, name: sr.projector.name, color: colorOf(sr.projector), segments: sr.segments, events: sr.events,
  }))
  const xMax = Math.max(2 * 60_000, tl ? tl.end - tl.origin : 0)
  const clockAt = (ms: number) => formatClock(new Date((tl?.origin ?? now) + ms)).slice(0, 5)
  /** Lần bật đang chứa thời điểm x (để biết máy đã bật bao lâu tại điểm đang trỏ). */
  const onSinceAt = (id: string, ms: number) => {
    const ev = tl?.series.find(sr => sr.projector.id === id)?.events ?? []
    return [...ev].reverse().find(e => e.on && e.x <= ms)?.x
  }

  const Row = ({ p, children }: { p: Projector; children: ReactNode }) => (
    <tr tabIndex={0} onClick={() => onOpen(p.id)} onKeyDown={e => { if (e.key === 'Enter') onOpen(p.id) }}
      className="cursor-pointer border-b border-border/60 transition-colors outline-none last:border-0 hover:bg-muted focus-visible:bg-muted">
      <td className={TD}><span className="font-semibold text-foreground">{p.name}</span><span className="ml-2 text-[10px] text-muted-foreground">{p.id}</span><span className="block text-[10px] text-muted-foreground">{group(p)}</span></td>
      {children}
    </tr>
  )

  return (
    <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-end gap-3 font-mono text-[10px] text-muted-foreground">
      {sample && <Badge tone="accent">{t('SAMPLE DATA — not real measurements')}</Badge>}
      <Button size="xs" variant={sample ? 'primary' : 'secondary'} aria-pressed={sample} onClick={() => setSample(v => !v)}>
        <FlaskConical size={11} />{sample ? t('STOP SAMPLE DATA') : t('USE SAMPLE DATA')}
      </Button>
    </div>
    <div className="grid grid-cols-2 gap-4 max-xl:grid-cols-1" data-testid="monitor">
      <Panel title={t('TEMPERATURE · POWER ON / OFF')} className="col-span-2 min-w-0 max-xl:col-span-1"
        aside={<Aside>{[tl && t('first projector on {time} · {d} ago', { time: clockAt(0), d: formatDuration(tl.end - tl.origin) }), temp.rows.length > 0 && t('avg {avg}°C · max {max}°C', { avg: temp.avg, max: temp.max })].filter(Boolean).join(' · ') || '—'}</Aside>}>
        <div className="grid grid-cols-[minmax(0,1fr)_17rem] gap-4 max-lg:grid-cols-1">
          {chartSeries.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground">{tl ? t('Collecting temperature samples…') : t('No projector has been switched on yet.')}</p>
          ) : (
            <LineChart series={chartSeries} xMax={xMax} xLabel={clockAt} highlight={focus} onHighlight={setFocus}
              thresholds={[{ value: 55, color: 'var(--color-warn)', label: t('Warning {n}°C', { n: 55 }) }, { value: 70, color: 'var(--color-danger)', label: t('Danger {n}°C', { n: 70 }) }]}
              label={t('Temperature and power on / off over time')}
              renderTip={(sr, pt) => {
                const p = projectors.find(x => x.id === sr.id)!
                const st = monitorStatus(p)
                const since = onSinceAt(sr.id, pt.x)
                return (
                  <>
                    <p className="mb-1 flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: sr.color }} /><span className="font-semibold text-foreground">{p.name}</span><span className="text-[10px] text-muted-foreground">{p.id}</span></p>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
                      <dt className="text-muted-foreground">{t('TEMP')}</dt><dd className={cn('text-right font-bold', TONE_TEXT[temperatureTone(pt.y)])}>{pt.y}°C</dd>
                      <dt className="text-muted-foreground">{t('AT')}</dt><dd className="text-right text-foreground">{formatClock(new Date((tl?.origin ?? now) + pt.x))}</dd>
                      {since !== undefined && <><dt className="text-muted-foreground">{t('ON FOR')}</dt><dd className="text-right text-foreground">{formatDuration(pt.x - since)} <span className="text-muted-foreground">({t('since')} {clockAt(since)})</span></dd></>}
                      <dt className="text-muted-foreground">{t('STATUS')}</dt><dd className="text-right"><Badge tone={st.tone}>{t(st.label)}</Badge></dd>
                      <dt className="text-muted-foreground">{t('Group')}</dt><dd className="text-right text-foreground">{group(p)}</dd>
                    </dl>
                  </>
                )
              }} />
          )}
          {/* Khung ghi chú màu: MỌI máy đang xem (kể cả máy chưa có đường: tắt / mất kết nối) kèm trạng thái kết nối và nhiệt độ. */}
          <aside aria-label={t('Projector colours')} className="self-start rounded-sm border border-border bg-muted/40">
            <p className="border-b border-border px-3 py-2 font-mono text-[10px] tracking-[0.1em] text-muted-foreground">{t('PROJECTOR COLOURS')}</p>
            <ul className="max-h-96 overflow-y-auto py-1">
              {projectors.map(p => {
                const line = chartSeries.find(sr => sr.id === p.id)
                const st = monitorStatus(p), c = p.telemetry.temperatureC
                return (
                  <li key={p.id} data-legend={p.id}>
                    <button type="button" onMouseEnter={() => line && setFocus(p.id)} onMouseLeave={() => setFocus(null)} onFocus={() => line && setFocus(p.id)} onBlur={() => setFocus(null)} onClick={() => onOpen(p.id)}
                      className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-xs transition-colors hover:bg-muted', focus === p.id && 'bg-muted')}>
                      <span className={cn('size-3 shrink-0 rounded-sm', !line && 'border border-dashed border-muted-foreground/60')} style={line ? { background: line.color } : undefined} aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-foreground">{p.name}</span>
                      <Badge tone={st.tone}>{t(st.label)}</Badge>
                      <span className={cn('w-10 shrink-0 text-right', c > 0 ? TONE_TEXT[temperatureTone(c)] : 'text-muted-foreground')}>{c > 0 ? `${c}°C` : '—'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>
        </div>
        {chartSeries.length > 0 && <p className="mt-2 font-mono text-[10px] text-muted-foreground">{t('Power on ▲ · power off ■ (under the time axis)')}</p>}
        {(temp.missing > 0 || onTime.off > 0) && <p className="mt-2 font-mono text-[10px] text-muted-foreground">{[onTime.off > 0 && t('{n} projector(s) are not on', { n: onTime.off }), temp.missing > 0 && temp.rows.length > 0 && t('{n} projector(s) report no temperature', { n: temp.missing })].filter(Boolean).join(' · ')}</p>}
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
    </div>
  )
}

import { useEffect, useState } from 'react'
import { cn } from '@/utils/cn'
import { formatDuration } from '@/utils/format'
import { longestOnMs, type FleetStats } from '@/utils/fleet'
import { TEMP_RANGE, TONE_BG, TONE_TEXT, temperatureTone, type Tone } from '@/utils/tones'
import type { Projector } from '@/types'
import { t } from '@/i18n'

const RADIUS = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function healthTone(ratio: number): Tone {
  if (ratio >= 0.9) return 'ok'
  if (ratio >= 0.6) return 'warn'
  return 'danger'
}

function FleetHealthGauge({ online, total }: { online: number; total: number }) {
  const ratio = total === 0 ? 0 : online / total
  const tone = healthTone(ratio)
  return (
    <div className="relative size-[60px]">
      <svg width="60" height="60" viewBox="0 0 60 60" className="-rotate-90" aria-hidden>
        <circle cx="30" cy="30" r={RADIUS} fill="none" strokeWidth="5" className="stroke-border" />
        <circle
          cx="30" cy="30" r={RADIUS} fill="none" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE * ratio} ${CIRCUMFERENCE}`}
          className={cn('transition-[stroke-dasharray] duration-500', { ok: 'stroke-ok', warn: 'stroke-warn', danger: 'stroke-danger', accent: 'stroke-accent', off: 'stroke-off' }[tone])}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-bold text-foreground">
        {total === 0 ? '—' : `${Math.round(ratio * 100)}%`}
      </span>
    </div>
  )
}

function TempChart({ projectors }: { projectors: Projector[] }) {
  const active = projectors.filter(p => p.power !== 'off')
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {active.map(p => (
        <div
          key={p.id}
          title={`${p.name}: ${p.telemetry.temperatureC}°C`}
          className={cn('w-2.5 shrink-0 rounded-sm opacity-80', TONE_BG[temperatureTone(p.telemetry.temperatureC)])}
          style={{ height: Math.max(4, Math.min(32, Math.round(((p.telemetry.temperatureC - TEMP_RANGE.min) / (TEMP_RANGE.max - TEMP_RANGE.min)) * 32))) }}
        />
      ))}
    </div>
  )
}

function Stat({ value, label, valueClassName }: { value: string | number; label: string; valueClassName?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn('font-mono text-lg leading-none font-bold text-foreground', valueClassName)}>{value}</span>
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

// Khi hàng bị xuống dòng (vùng nội dung hẹp) các vạch chia sẽ lẻ loi → ẩn theo bề rộng container.
const Divider = () => <div className="h-10 w-px bg-border @max-[1120px]:hidden" />

export function FleetMetrics({ stats, projectors, power, actions }: { stats: FleetStats; projectors: Projector[]; power?: React.ReactNode; actions: React.ReactNode }) {
  const avgTone = stats.avgTemp > 0 ? temperatureTone(stats.avgTemp) : null
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id) }, [])
  const onMs = longestOnMs(projectors, now)
  return (
    <div className="@container shrink-0 border-b border-border bg-muted">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3">
      <div className="flex items-center gap-3">
        <FleetHealthGauge online={stats.online} total={stats.total} />
        <div className="font-mono text-xs">
          <p className="font-medium text-foreground">{t('{online}/{total} Operational', { online: stats.online, total: stats.total })}</p>
          <p className="text-muted-foreground">{t('Fleet Health')}</p>
        </div>
      </div>
      <Divider />
      <Stat value={stats.alerts} label={t('Active Alerts')} valueClassName={stats.alerts > 0 ? 'text-danger' : 'text-ok'} />
      <Divider />
      <Stat value={stats.avgTemp > 0 ? `${stats.avgTemp}°C` : '—'} label={t('Avg Temperature')} valueClassName={avgTone ? TONE_TEXT[avgTone] : undefined} />
      <Divider />
      <div className="flex flex-col gap-1">
        <TempChart projectors={projectors} />
        <span className="font-mono text-xs text-muted-foreground">
          {t('Hottest:')} {stats.hottest ? `${stats.hottest.name} ${stats.hottest.telemetry.temperatureC}°C` : '—'}
        </span>
      </div>
      <Divider />
      <Stat value={onMs > 0 ? formatDuration(onMs) : '—'} label={t('Time Since Power On')} />
    </div>
    {/* Hàng 2: nút điều khiển — bật / tắt bên trái, rồi shutter, OSD, test pattern. */}
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3 border-t border-border/60 px-5 py-2.5">
      {power && <>{power}<div className="h-10 w-px bg-border" /></>}
      {actions}
    </div>
    </div>
  )
}

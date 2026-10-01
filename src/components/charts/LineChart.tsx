import type { Sample } from '@/services/telemetryHistory'

export interface LineSeries { id: string; name: string; color: string; points: readonly Sample[] }

const W = 600, H = 190
const PAD = { l: 40, r: 12, t: 12, b: 26 }

/** Màu theo thứ tự (HSL, tách biệt trên nền tối và sáng). */
export const seriesColor = (i: number): string => `hsl(${(i * 47 + 200) % 360} 70% 55%)`

/**
 * Biểu đồ đường nhiệt độ theo thời gian (SVG, không thư viện). Trục ngang: từ `now - window` đến `now`; trục dọc: °C tự co giãn.
 * `thresholds`: các vạch ngưỡng (vd. 55 cảnh báo, 70 nguy hiểm) vẽ nét đứt nếu nằm trong khoảng.
 */
export function LineChart({ series, now, windowMs, thresholds, label }: {
  series: LineSeries[]
  now: number
  windowMs: number
  thresholds?: { value: number; color: string }[]
  label: string
}) {
  const all = series.flatMap(s => s.points.map(p => p.c))
  const lo = Math.max(0, Math.floor((Math.min(...all) - 5) / 5) * 5)
  const hi = Math.max(lo + 20, Math.ceil((Math.max(...all) + 5) / 5) * 5)
  const x = (t: number) => PAD.l + ((t - (now - windowMs)) / windowMs) * (W - PAD.l - PAD.r)
  const y = (c: number) => PAD.t + (1 - (c - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const yTicks = [lo, lo + (hi - lo) / 2, hi]
  const minutes = Math.round(windowMs / 60_000)
  const xTicks = [[0, `−${minutes}m`], [0.5, `−${Math.round(minutes / 2)}m`], [1, 'now']] as const

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full font-mono" style={{ height: 'auto' }}>
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--color-border)" strokeWidth={1} />
          <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" fontSize={13} fill="var(--color-muted-foreground)">{Math.round(v)}°</text>
        </g>
      ))}
      {thresholds?.filter(th => th.value > lo && th.value < hi).map(th => (
        <line key={th.value} x1={PAD.l} x2={W - PAD.r} y1={y(th.value)} y2={y(th.value)} stroke={th.color} strokeWidth={1} strokeDasharray="4 4" opacity={0.7} />
      ))}
      {xTicks.map(([f, text]) => (
        <text key={text} x={PAD.l + f * (W - PAD.l - PAD.r)} y={H - 7} textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'} fontSize={13} fill="var(--color-muted-foreground)">{text}</text>
      ))}
      {series.map(s => {
        const pts = s.points.filter(p => p.t >= now - windowMs)
        if (pts.length === 0) return null
        const last = pts[pts.length - 1]!
        return (
          <g key={s.id} data-series={s.id}>
            {pts.length > 1 && <polyline points={pts.map(p => `${x(p.t).toFixed(1)},${y(p.c).toFixed(1)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />}
            <circle cx={x(last.t)} cy={y(last.c)} r={3} fill={s.color}><title>{`${s.name}: ${last.c}°C`}</title></circle>
          </g>
        )
      })}
    </svg>
  )
}

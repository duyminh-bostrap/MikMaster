import { useState } from 'react'

export interface LinePoint { x: number; y: number }
export interface LineSeries {
  id: string
  color: string
  points: readonly LinePoint[]
  /** Nhãn ghi ngay cuối đường: tên, giá trị hiện tại (có màu riêng) và chi tiết (vd. thời gian bật). */
  label: { name: string; value: string; valueColor: string; detail: string }
}

const W = 1000
const PAD = { l: 46, r: 262, t: 14, b: 32 }
const LABEL_GAP = 19
const MIN_H = 300
const NAME_MAX = 14

/** Màu theo thứ tự (HSL, tách biệt trên nền tối và sáng). */
export const seriesColor = (i: number): string => `hsl(${(i * 47 + 200) % 360} 75% 58%)`

const STEPS_MIN = [1, 2, 5, 10, 15, 30, 60, 120, 240, 480, 720, 1440]

/** Bước chia trục ngang (ms) sao cho có không quá ~6 vạch. */
export function niceStepMs(maxMs: number): number {
  const target = maxMs / 6 / 60_000
  return (STEPS_MIN.find(m => m >= target) ?? 1440) * 60_000
}

/** Vị trí dọc của các nhãn: giữ thứ tự theo y mong muốn, cách nhau ≥ gap, nằm trong [min, max]. */
export function spreadLabels(desired: number[], gap: number, min: number, max: number): number[] {
  const order = desired.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y)
  const out = new Array<number>(desired.length)
  let prev = min - gap
  for (const o of order) { prev = Math.max(o.y, prev + gap); out[o.i] = prev }
  // Tràn đáy → đẩy ngược lên.
  let limit = max
  for (let k = order.length - 1; k >= 0; k--) { const i = order[k]!.i; out[i] = Math.min(out[i]!, limit); limit = out[i]! - gap }
  return out
}

const short = (s: string) => (s.length > NAME_MAX ? `${s.slice(0, NAME_MAX - 1)}…` : s)

/**
 * Biểu đồ đường tổng quan (SVG, không thư viện): trục ngang là thời gian (ms) từ 0, trục dọc °C. Mỗi đường có nhãn ngay cuối
 * (tên · giá trị · chi tiết) xếp không đè nhau nên nhìn là biết máy nào, bao nhiêu độ. Rê chuột / focus vào nhãn để nhấn mạnh đường;
 * bấm nhãn để mở máy. Chiều cao tự tăng theo số máy.
 */
export function LineChart({ series, xMax, xLabel, thresholds, onSelect, label }: {
  series: LineSeries[]
  xMax: number
  xLabel: (ms: number) => string
  thresholds?: { value: number; color: string }[]
  onSelect?: (id: string) => void
  label: string
}) {
  const [focus, setFocus] = useState<string | null>(null)
  const H = Math.max(MIN_H, PAD.t + PAD.b + series.length * LABEL_GAP)
  const ys = series.flatMap(s => s.points.map(p => p.y))
  const lo = Math.max(0, Math.floor((Math.min(...ys) - 5) / 5) * 5)
  const hi = Math.max(lo + 20, Math.ceil((Math.max(...ys) + 5) / 5) * 5)
  const plotR = W - PAD.r
  const x = (v: number) => PAD.l + (v / xMax) * (plotR - PAD.l)
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const yTicks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) / 4) * i)
  const step = niceStepMs(xMax)
  const xTicks = Array.from({ length: Math.floor(xMax / step) + 1 }, (_, i) => i * step)
  const ends = series.map(s => s.points[s.points.length - 1]!)
  const labelY = spreadLabels(ends.map(p => y(p.y)), LABEL_GAP, PAD.t + 8, H - PAD.b - 4)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={label} className="w-full font-mono">
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PAD.l} x2={plotR} y1={y(v)} y2={y(v)} stroke="var(--color-border)" strokeWidth={1} />
          <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize={13} fill="var(--color-muted-foreground)">{Math.round(v)}°</text>
        </g>
      ))}
      {xTicks.map(v => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-border)" strokeWidth={1} opacity={0.5} />
          <text x={x(v)} y={H - 9} textAnchor={v === 0 ? 'start' : 'middle'} fontSize={13} fill="var(--color-muted-foreground)">{xLabel(v)}</text>
        </g>
      ))}
      {thresholds?.filter(th => th.value > lo && th.value < hi).map(th => (
        <g key={th.value}>
          <line x1={PAD.l} x2={plotR} y1={y(th.value)} y2={y(th.value)} stroke={th.color} strokeWidth={1.25} strokeDasharray="6 5" opacity={0.8} />
          <text x={plotR - 4} y={y(th.value) - 4} textAnchor="end" fontSize={12} fill={th.color}>{th.value}°C</text>
        </g>
      ))}
      {series.map((s, i) => {
        const end = ends[i]!
        const dim = focus != null && focus !== s.id
        const on = focus === s.id
        const ly = labelY[i]!
        return (
          <g key={s.id} data-series={s.id} opacity={dim ? 0.2 : 1}>
            {s.points.length > 1 && <polyline points={s.points.map(p => `${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={on ? 3.5 : 2.5} strokeLinejoin="round" strokeLinecap="round" />}
            <path d={`M${x(end.x)},${y(end.y)} L${plotR + 8},${ly}`} stroke={s.color} strokeWidth={1} fill="none" opacity={0.6} />
            <circle cx={x(end.x)} cy={y(end.y)} r={on ? 5.5 : 4} fill={s.color} />
            <g data-label={s.id} role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined} aria-label={`${s.label.name} ${s.label.value} ${s.label.detail}`}
              style={{ cursor: onSelect ? 'pointer' : undefined, outline: 'none' }}
              onMouseEnter={() => setFocus(s.id)} onMouseLeave={() => setFocus(null)} onFocus={() => setFocus(s.id)} onBlur={() => setFocus(null)}
              onClick={() => onSelect?.(s.id)} onKeyDown={e => { if (e.key === 'Enter') onSelect?.(s.id) }}>
              <rect x={plotR + 8} y={ly - LABEL_GAP / 2} width={PAD.r - 12} height={LABEL_GAP - 1} fill="transparent" />
              <circle cx={plotR + 16} cy={ly} r={4.5} fill={s.color} />
              <text x={plotR + 26} y={ly + 4.5} fontSize={13} fill="var(--color-foreground)" fontWeight={on ? 700 : 500}>{short(s.label.name)}</text>
              <text x={plotR + 150} y={ly + 4.5} fontSize={13} fill={s.label.valueColor} fontWeight={700}>{s.label.value}</text>
              <text x={plotR + 202} y={ly + 4.5} fontSize={12} fill="var(--color-muted-foreground)">{s.label.detail}</text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}

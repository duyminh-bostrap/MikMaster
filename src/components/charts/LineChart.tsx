import { WifiOff } from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'

/** `y: null` = máy đang tắt / chờ: vẽ ở đáy trục (đường vẫn nối liền). */
export interface LinePoint { x: number; y: number | null }
export interface LineSeries {
  id: string
  name: string
  color: string
  /** Các đoạn liền (vd. mỗi lần máy bật); giữa hai đoạn đường bị ngắt. */
  segments: readonly (readonly LinePoint[])[]
  /** Dấu bật (▲) / tắt (■) / mất kết nối (icon đỏ) trên trục thời gian. */
  events?: readonly { x: number; on: boolean; lost?: boolean }[]
  /** Máy đang mất kết nối: icon đỏ ở cuối đường. */
  lost?: boolean
}
export interface Threshold { value: number; color: string; label: string }

const W = 1000
const H = 360
const PAD = { l: 46, r: 18, t: 14, b: 32 }
/** Khoảng cách (đơn vị viewBox) từ con trỏ tới đường để coi là "đang trỏ vào đường đó". */
const HIT = 16

/** Màu theo thứ tự (HSL, tách biệt trên nền tối và sáng). */
export const seriesColor = (i: number): string => `hsl(${(i * 47 + 200) % 360} 75% 58%)`

const STEPS_MIN = [1, 2, 5, 10, 15, 30, 60, 120, 240, 480, 720, 1440]

/** Bước chia trục ngang (ms) sao cho có không quá ~6 vạch. */
export function niceStepMs(maxMs: number): number {
  const target = maxMs / 6 / 60_000
  return (STEPS_MIN.find(m => m >= target) ?? 1440) * 60_000
}

/** Khoảng cách từ điểm (px,py) tới đoạn (ax,ay)-(bx,by) (đoạn suy biến thành điểm vẫn dùng được). */
export function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/** Giới hạn số điểm vẽ cho mỗi đoạn (giữ điểm đầu / cuối); dữ liệu dày hơn thì lấy thưa. */
const MAX_DRAW = 700
export function decimate<T>(pts: readonly T[], max = MAX_DRAW): readonly T[] {
  if (pts.length <= max) return pts
  const k = Math.ceil(pts.length / max)
  const out = pts.filter((_, i) => i % k === 0)
  if (out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]!)
  return out
}

interface Hover { id: string; point: LinePoint; left: number; top: number; flip: boolean }

/**
 * Biểu đồ đường tổng quan (SVG, không thư viện): trục ngang là thời gian (ms) từ 0, trục dọc °C; vùng trên ngưỡng được tô nền.
 * Rê chuột vào một đường: đường đó nổi lên (các đường khác mờ), có đường kẻ dọc + điểm tròn tại mẫu gần nhất và khung thông tin
 * (do `renderTip` dựng) — rời khỏi đường thì khung biến mất. `highlight` / `onHighlight` cho phép khung chú thích bên cạnh dùng chung trạng thái.
 */
export function LineChart({ series, xMin = 0, xMax, xLabel, xStep, yRange, thresholds, highlight, onHighlight, renderTip, label }: {
  series: LineSeries[]
  /** Đầu trái của trục thời gian (ms); mặc định 0. Phần ngoài [xMin, xMax] bị cắt. */
  xMin?: number
  xMax: number
  /** Bước chia trục ngang (ms); mặc định tự chọn. */
  xStep?: number
  /** Dải trục dọc cố định (vd. 20–45°C); giá trị vượt ra ngoài thì trục tự nới. Bỏ trống = tự co giãn. */
  yRange?: { min: number; max: number }
  xLabel: (ms: number) => string
  thresholds?: Threshold[]
  highlight?: string | null
  onHighlight?: (id: string | null) => void
  renderTip: (series: LineSeries, point: LinePoint) => ReactNode
  label: string
}) {
  const clipId = useId()
  const svg = useRef<SVGSVGElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<Hover | null>(null)

  const ys = series.flatMap(s => s.segments.flatMap(sg => sg.filter(p => p.y !== null && p.x >= xMin && p.x <= xMax).map(p => p.y as number)))
  if (ys.length === 0) ys.push(yRange?.min ?? 20, yRange?.max ?? 45)
  const lo = yRange ? Math.min(yRange.min, Math.floor(Math.min(...ys) / 5) * 5) : Math.max(0, Math.floor((Math.min(...ys) - 5) / 5) * 5)
  const hi = yRange ? Math.max(yRange.max, Math.ceil(Math.max(...ys) / 5) * 5) : Math.max(lo + 20, Math.ceil((Math.max(...ys, ...(thresholds?.map(th => th.value) ?? [])) + 5) / 5) * 5)
  const plotR = W - PAD.r
  const span = Math.max(1, xMax - xMin)
  const x = (v: number) => PAD.l + ((v - xMin) / span) * (plotR - PAD.l)
  // y = null (máy tắt / chờ) → đáy trục.
  const y = (v: number | null) => PAD.t + (1 - ((v ?? lo) - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const yTicks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) / 4) * i)
  const step = xStep ?? niceStepMs(span)
  const first = Math.ceil(xMin / step) * step
  const xTicks = Array.from({ length: Math.max(0, Math.floor((xMax - first) / step) + 1) }, (_, i) => first + i * step)
  const sorted = [...(thresholds ?? [])].sort((a, b) => a.value - b.value)

  function setActive(h: Hover | null) {
    setHover(h)
    onHighlight?.(h?.id ?? null)
  }

  function onMove(e: React.PointerEvent) {
    const box = svg.current?.getBoundingClientRect()
    const wbox = wrap.current?.getBoundingClientRect()
    if (!box || !wbox || box.width === 0) return
    const vx = ((e.clientX - box.left) / box.width) * W
    const vy = ((e.clientY - box.top) / box.height) * H
    let best: { s: LineSeries; d: number } | null = null
    for (const s of series) {
      for (const pts of s.segments) {
        if (pts.length === 0 || pts[pts.length - 1]!.x < xMin || pts[0]!.x > xMax) continue
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i]!, b = pts[i + 1] ?? a
          const d = distToSegment(vx, vy, x(a.x), y(a.y), x(b.x), y(b.y))
          if (!best || d < best.d) best = { s, d }
          if (i === pts.length - 1) break
        }
      }
    }
    if (!best || best.d > HIT) { if (hover) setActive(null); return }
    const point = best.s.segments.flat().filter(p => p.x >= xMin && p.x <= xMax).reduce((n, p) => (Math.abs(x(p.x) - vx) < Math.abs(x(n.x) - vx) ? p : n))
    const left = e.clientX - wbox.left, top = e.clientY - wbox.top
    setActive({ id: best.s.id, point, left, top, flip: left > wbox.width * 0.6 })
  }

  const focus = hover?.id ?? highlight ?? null
  const hovered = hover ? series.find(s => s.id === hover.id) : undefined

  return (
    <div ref={wrap} className="relative">
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={label} className="w-full touch-none font-mono" onPointerMove={onMove} onPointerLeave={() => setActive(null)}>
        {sorted.map((th, i) => {
          const top = y(Math.min(hi, sorted[i + 1]?.value ?? hi))
          return th.value < hi && <rect key={th.value} x={PAD.l} y={top} width={plotR - PAD.l} height={Math.max(0, y(th.value) - top)} fill={th.color} opacity={0.08} />
        })}
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
        {sorted.filter(th => th.value > lo && th.value < hi).map(th => (
          <g key={th.value}>
            <line x1={PAD.l} x2={plotR} y1={y(th.value)} y2={y(th.value)} stroke={th.color} strokeWidth={1.25} strokeDasharray="6 5" opacity={0.85} />
            <text x={PAD.l + 8} y={y(th.value) - 5} fontSize={12} fill={th.color}>{th.label}</text>
          </g>
        ))}
        {hover && <line x1={x(hover.point.x)} x2={x(hover.point.x)} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-muted-foreground)" strokeWidth={1} opacity={0.7} />}
        <defs><clipPath id={clipId}><rect x={PAD.l} y={PAD.t - 2} width={plotR - PAD.l} height={H - PAD.t - PAD.b + 4} /></clipPath></defs>
        {series.map(s => {
          const on = focus === s.id
          const dim = focus != null && !on
          const inRange = s.segments.map(sg => sg.filter(p => p.x >= xMin - span * 0.02 && p.x <= xMax))
          const lastSeg = [...inRange].reverse().find(sg => sg.length > 0)
          const end = lastSeg?.[lastSeg.length - 1]
          return (
            <g key={s.id} data-series={s.id} opacity={dim ? 0.15 : 1}>
              <g clipPath={`url(#${clipId})`}>
                {s.segments.map((sg, k) => {
                  const pts = decimate(sg)
                  return pts.length > 1
                    ? <polyline key={k} points={pts.map(p => `${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={on ? 4 : 2.5} strokeLinejoin="round" strokeLinecap="round" />
                    : pts[0] && <circle key={k} cx={x(pts[0].x)} cy={y(pts[0].y)} r={3} fill={s.color} />
                })}
              </g>
              {end && (s.lost
                ? <WifiOff data-lost-end x={x(end.x) - 8} y={y(end.y) - 8} width={16} height={16} color="var(--color-danger)" strokeWidth={2.5} />
                : <circle cx={x(end.x)} cy={y(end.y)} r={on ? 5.5 : 4} fill={s.color} />)}
              {s.events?.filter(e => e.x >= xMin && e.x <= xMax).map((e, k) => {
                const ex = x(e.x), ey = H - PAD.b
                if (e.lost) return <g key={k} data-event="lost"><WifiOff x={ex - 7} y={ey - 15} width={14} height={14} color="var(--color-danger)" strokeWidth={2.5} /><title>{`${s.name}: OFFLINE ${xLabel(e.x)}`}</title></g>
                return e.on
                  ? <path key={k} data-event="on" d={`M${ex},${ey - 9} l5,8 l-10,0 z`} fill={s.color}><title>{`${s.name}: ON ${xLabel(e.x)}`}</title></path>
                  : <rect key={k} data-event="off" x={ex - 4} y={ey - 9} width={8} height={8} fill="var(--color-card)" stroke={s.color} strokeWidth={2}><title>{`${s.name}: OFF ${xLabel(e.x)}`}</title></rect>
              })}
            </g>
          )
        })}
        {hover && hovered && <circle cx={x(hover.point.x)} cy={y(hover.point.y)} r={6.5} fill="var(--color-card)" stroke={hovered.color} strokeWidth={3} />}
      </svg>
      {hover && hovered && (
        <div role="tooltip" data-testid="chart-tip" style={{ left: hover.left, top: hover.top, transform: `translate(${hover.flip ? 'calc(-100% - 14px)' : '14px'}, 14px)` }}
          className="pointer-events-none absolute z-10 min-w-56 whitespace-nowrap rounded-sm border border-border bg-card px-3 py-2 font-mono text-xs shadow-lg">
          {renderTip(hovered, hover.point)}
        </div>
      )}
    </div>
  )
}

import { LayoutGrid } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { PowerDot } from '@/components/ui/StatusDot'
import { useT } from '@/i18n'
import { useProjectActions } from '@/store/hooks'
import type { Booth, Projector } from '@/types'
import { cn } from '@/utils/cn'
import { MAP, autoLayout, canvasHeight, clampPos, groupColor, snap, type Pos } from '@/utils/mapLayout'
import { TONE_TEXT, temperatureTone } from '@/utils/tones'

const DRAG_THRESHOLD = 4
type Status = 'on' | 'off' | 'offline' | 'login'

function statusOf(p: Projector): Status {
  if (p.connection === 'auth-failed') return 'login'
  if (p.connection !== 'connected') return 'offline'
  return p.power === 'on' ? 'on' : 'off'
}
const STATUS_BORDER: Record<Status, string> = { on: 'border-ok/60', off: 'border-border', offline: 'border-danger/60', login: 'border-warn/60' }

/**
 * Sơ đồ 2D của mọi máy: kéo từng ô đến đúng vị trí thật (lưu theo project), bấm để mở máy, chuột phải để sửa / chuyển group.
 * Thanh màu bên trái mỗi ô = group. Máy chưa đặt vị trí được xếp tự động theo group; "Sắp xếp lại" xoá vị trí đã đặt.
 */
export function ProjectorMap({ projectors, booths, emptyText, onOpen, onContextMenu }: {
  projectors: Projector[]
  booths: Booth[]
  emptyText: string
  onOpen: (id: string) => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
}) {
  const t = useT()
  const { updateProjector } = useProjectActions()
  const layout = useMemo(() => autoLayout(booths, projectors), [booths, projectors])
  const [drag, setDrag] = useState<{ id: string; pos: Pos } | null>(null)
  const gesture = useRef<{ id: string; startX: number; startY: number; origin: Pos; moved: boolean } | null>(null)

  const posOf = (p: Projector): Pos => (drag?.id === p.id ? drag.pos : p.mapPos ?? layout.pos[p.id] ?? { x: 0, y: 0 })
  const height = canvasHeight(projectors.map(posOf), layout.height)
  const colorOf = (p: Projector) => {
    const i = booths.findIndex(b => b.id === p.boothId)
    return i < 0 ? 'hsl(0 0% 55%)' : groupColor(i)
  }
  const hasCustom = projectors.some(p => p.mapPos)

  if (projectors.length === 0) {
    return <div className="flex h-full items-center justify-center"><span className="font-mono text-sm text-muted-foreground">{emptyText}</span></div>
  }

  const commit = (id: string, pos: Pos) => updateProjector(id, { mapPos: pos })

  function onPointerDown(e: React.PointerEvent, p: Projector) {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    gesture.current = { id: p.id, startX: e.clientX, startY: e.clientY, origin: posOf(p), moved: false }
  }
  function onPointerMove(e: React.PointerEvent) {
    const g = gesture.current
    if (!g) return
    const dx = e.clientX - g.startX, dy = e.clientY - g.startY
    if (!g.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    g.moved = true
    setDrag({ id: g.id, pos: clampPos({ x: snap(g.origin.x + dx), y: snap(g.origin.y + dy) }, Math.max(height, g.origin.y + MAP.nodeH + MAP.pad + dy)) })
  }
  function onPointerUp(_e: React.PointerEvent, p: Projector) {
    const g = gesture.current
    gesture.current = null
    if (!g) return
    if (g.moved && drag) commit(p.id, drag.pos)
    else onOpen(p.id)
    setDrag(null)
  }
  function onKeyDown(e: React.KeyboardEvent, p: Projector) {
    const step = e.shiftKey ? MAP.snap * 5 : MAP.snap
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
    if (d) { e.preventDefault(); const cur = posOf(p); commit(p.id, clampPos({ x: cur.x + d[0]!, y: cur.y + d[1]! }, height)) }
    else if (e.key === 'Enter') { e.preventDefault(); onOpen(p.id) }
  }
  const rearrange = () => { for (const p of projectors) if (p.mapPos) updateProjector(p.id, { mapPos: undefined }) }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground">
        {booths.map((b, i) => {
          const n = projectors.filter(p => p.boothId === b.id).length
          return n > 0 && <span key={b.id} className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: groupColor(i) }} />{b.name} <span className="opacity-70">{n}</span></span>
        })}
        <span className="ml-auto flex items-center gap-3">
          <span>{t('Drag to place · click to open')}</span>
          <button type="button" disabled={!hasCustom} onClick={rearrange} className="flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-muted-foreground transition-colors enabled:hover:text-foreground disabled:opacity-40">
            <LayoutGrid size={10} />{t('AUTO ARRANGE')}
          </button>
        </span>
      </div>
      <div className="overflow-auto rounded-sm border border-border">
        <div data-testid="projector-map" className="relative"
          style={{ width: MAP.width, height, backgroundColor: 'var(--color-muted)', backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)', backgroundSize: `${MAP.snap * 5}px ${MAP.snap * 5}px` }}>
          {projectors.map(p => {
            const pos = posOf(p), st = statusOf(p), dragging = drag?.id === p.id
            const temp = p.telemetry.temperatureC
            return (
              <div key={p.id} role="button" tabIndex={0} data-projector={p.id} aria-label={`${p.name} ${p.id}`}
                onPointerDown={e => onPointerDown(e, p)} onPointerMove={onPointerMove} onPointerUp={e => onPointerUp(e, p)}
                onPointerCancel={() => { gesture.current = null; setDrag(null) }}
                onContextMenu={e => onContextMenu(e, p.id)} onKeyDown={e => onKeyDown(e, p)}
                className={cn('absolute flex touch-none flex-col justify-center gap-0.5 overflow-hidden rounded-sm border bg-card py-1 pr-2 pl-3 font-mono select-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none',
                  STATUS_BORDER[st], p.errors.length > 0 && 'ring-1 ring-danger/60', dragging ? 'z-10 cursor-grabbing shadow-lg' : 'cursor-grab transition-shadow hover:shadow-md')}
                style={{ left: pos.x, top: pos.y, width: MAP.nodeW, height: MAP.nodeH }}>
                <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: colorOf(p) }} aria-hidden />
                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground"><PowerDot power={st === 'on' ? 'on' : 'off'} /><span className="truncate">{p.name}</span></span>
                <span className="truncate text-[10px] text-muted-foreground">{p.id} · {p.network.ip}</span>
                <span className={cn('text-[10px]', temp > 0 ? TONE_TEXT[temperatureTone(temp)] : 'text-muted-foreground')}>{temp > 0 ? `${temp}°C` : '—'}{st === 'offline' ? ` · ${t('Offline')}` : st === 'login' ? ` · ${t('LOGIN')}` : ''}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

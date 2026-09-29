import { Check, ExternalLink, MoveRight, Pencil } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Booth, Projector } from '@/types'

export interface MenuAnchor { x: number; y: number; projectorId: string }

/** Menu chuột phải cho máy chiếu: mở trang điều khiển, sửa thông tin, chuyển sang booth khác. */
export function ProjectorContextMenu({ anchor, projector, booths, onMove, onOpen, onEdit, onClose }: {
  anchor: MenuAnchor
  projector: Projector
  booths: Booth[]
  onMove: (boothId: string) => void
  onOpen: () => void
  onEdit: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: anchor.x, top: anchor.y })

  // Giữ menu trong khung nhìn khi bấm sát mép phải/dưới.
  useLayoutEffect(() => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    setPos({ left: Math.min(anchor.x, window.innerWidth - r.width - 8), top: Math.min(anchor.y, window.innerHeight - r.height - 8) })
  }, [anchor.x, anchor.y])

  useEffect(() => {
    const close = (e: Event) => { if (!(e.target instanceof Node && ref.current?.contains(e.target))) onClose() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('pointerdown', close)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    window.addEventListener('keydown', onKey)
    ref.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus()
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const item = 'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted focus:bg-muted focus:outline-none disabled:cursor-default disabled:text-muted-foreground disabled:hover:bg-transparent'

  return (
    <div ref={ref} role="menu" aria-label={`Actions for ${projector.name}`} style={pos}
      onContextMenu={e => e.preventDefault()}
      className="fixed z-50 min-w-48 overflow-hidden rounded-sm border border-border bg-card py-1 shadow-xl shadow-black/40">
      <p className="truncate px-3 pt-1 pb-1.5 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">{projector.id} · {projector.name}</p>
      <button type="button" role="menuitem" className={item} onClick={() => { onOpen(); onClose() }}>
        <ExternalLink size={11} />Open control
      </button>
      <button type="button" role="menuitem" className={item} onClick={() => { onEdit(); onClose() }}>
        <Pencil size={11} />Edit info…
      </button>
      <div className="my-1 h-px bg-border" />
      <p className="flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground"><MoveRight size={10} />MOVE TO BOOTH</p>
      {booths.map(b => {
        const current = b.id === projector.boothId
        return (
          <button key={b.id} type="button" role="menuitem" disabled={current} className={item} onClick={() => { onMove(b.id); onClose() }}>
            <span className="flex size-3 items-center justify-center">{current && <Check size={11} className="text-primary" />}</span>
            {b.name}
          </button>
        )
      })}
    </div>
  )
}

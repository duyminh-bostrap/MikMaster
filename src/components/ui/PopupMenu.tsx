import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface MenuPoint { x: number; y: number }

/** Khung menu nổi tại vị trí con trỏ: luôn nằm trong khung nhìn, đóng khi bấm ra ngoài / Esc / cuộn. */
export function PopupMenu({ at, label, onClose, children, className }: {
  at: MenuPoint
  label: string
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: at.x, top: at.y })

  // Kẹp lại cả khi nội dung đổi kích thước (ví dụ hiện kết quả ping).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const clamp = () => {
      const r = el.getBoundingClientRect()
      setPos({ left: Math.max(8, Math.min(at.x, window.innerWidth - r.width - 8)), top: Math.max(8, Math.min(at.y, window.innerHeight - r.height - 8)) })
    }
    clamp()
    const ro = new ResizeObserver(clamp)
    ro.observe(el)
    return () => ro.disconnect()
  }, [at.x, at.y])

  useEffect(() => {
    const close = (e: Event) => { if (!(e.target instanceof Node && ref.current?.contains(e.target))) onClose() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    // Cuộn trễ (vừa cuộn thẻ vào tầm nhìn / cuộn quán tính) ngay lúc mở không được đóng menu.
    const openedAt = Date.now()
    const onScroll = () => { if (Date.now() - openedAt > 150) onClose() }
    window.addEventListener('pointerdown', close)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onClose)
    window.addEventListener('keydown', onKey)
    ref.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus()
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div ref={ref} role="menu" aria-label={label} style={pos} onContextMenu={e => e.preventDefault()}
      className={cn('fixed z-50 w-60 overflow-hidden rounded-sm border border-border bg-card py-1 shadow-xl shadow-black/40', className)}>
      {children}
    </div>
  )
}

export const MENU_ITEM =
  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground hover:bg-muted focus:bg-muted focus:outline-none disabled:cursor-default disabled:text-muted-foreground disabled:hover:bg-transparent'

export function MenuItem({ icon, label, hint, disabled, onSelect }: { icon?: ReactNode; label: ReactNode; hint?: string; disabled?: boolean; onSelect: () => void }) {
  return (
    <button type="button" role="menuitem" disabled={disabled} className={MENU_ITEM} onClick={onSelect}>
      <span className="flex size-3 shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="font-mono text-[10px] text-muted-foreground">{hint}</span>}
    </button>
  )
}

export const MenuSeparator = () => <div className="my-1 h-px bg-border" />

export const MenuHeading = ({ children }: { children: ReactNode }) => (
  <p className="flex items-center gap-1.5 truncate px-3 py-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">{children}</p>
)

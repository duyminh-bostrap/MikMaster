import { ChevronDown, Lock, UserRound } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useT } from '@/i18n'
import { cn } from '@/utils/cn'
import { needsAuth } from '@/utils/credentials'
import type { Projector } from '@/types'
import { AccountPanel } from './AccountPanel'

/**
 * Đăng nhập máy chiếu ở góc trên bên phải trang máy. Cần đăng nhập → nút vàng "SIGN IN" (khung đăng nhập mở sẵn);
 * đã đăng nhập → tên tài khoản, bấm để đổi tài khoản / đăng xuất. Máy không có xác thực → không hiện gì.
 */
export function AccountMenu({ projector: p, locked, open, onOpenChange }: {
  projector: Projector
  locked: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (!(e.target instanceof Node && ref.current?.contains(e.target))) onOpenChange(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false) }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open, onOpenChange])

  if (!needsAuth(p.network.protocol.type)) return null
  const user = p.network.protocol.username || (p.network.protocol.password ? '••••' : '')

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => onOpenChange(!open)}
        className={cn('flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-xs transition-colors',
          locked ? 'animate-status border-warn/60 bg-warn/15 text-warn hover:bg-warn/25' : 'border-border text-muted-foreground hover:text-foreground')}>
        {locked ? <Lock size={11} /> : <UserRound size={11} />}
        {locked ? t('SIGN IN') : user}
        <ChevronDown size={10} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="dialog" aria-label={locked ? t('LOGIN REQUIRED') : t('CHANGE LOGIN')}
          className="absolute top-full right-0 z-50 mt-2 w-80 rounded-sm border border-border bg-card p-3 shadow-xl shadow-black/40">
          <AccountPanel key={`${p.id}:${locked}`} projector={p} mode={locked ? 'required' : 'change'} onDone={() => onOpenChange(false)} />
        </div>
      )}
    </div>
  )
}

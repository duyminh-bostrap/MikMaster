import { X } from 'lucide-react'
import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'
import { t } from '@/i18n'

/** Hộp thoại dạng form: Enter = lưu, Esc / bấm nền = huỷ. */
export function Modal({ title, onClose, onSubmit, children, footer }: {
  title: string
  onClose: () => void
  onSubmit: () => void
  children: ReactNode
  footer: ReactNode
}) {
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const first = ref.current?.querySelector<HTMLElement>('input, select, textarea') ?? ref.current?.querySelector<HTMLElement>('footer button')
    first?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function submit(e: FormEvent) {
    e.preventDefault()
    onSubmit()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <form ref={ref} role="dialog" aria-modal="true" aria-label={title} onSubmit={submit}
        className="w-full max-w-md overflow-hidden rounded-sm border border-border bg-card shadow-2xl shadow-black/50">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-mono text-xs font-medium tracking-[0.08em] text-muted-foreground">{title}</h2>
          <button type="button" aria-label={t('Close')} onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
        </header>
        <div className="flex flex-col gap-3 p-4">{children}</div>
        <footer className="flex items-center gap-2 border-t border-border px-4 py-3">{footer}</footer>
      </form>
    </div>
  )
}

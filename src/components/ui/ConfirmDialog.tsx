import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Button, type ButtonVariant } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useT } from '@/i18n'

export interface ConfirmOptions {
  title: string
  message: ReactNode
  confirmLabel: string
  tone?: ButtonVariant
}

/**
 * `const [confirmDialog, confirm] = useConfirm()` → `if (await confirm({...})) doIt()`; đặt `{confirmDialog}` trong JSX.
 * Enter = xác nhận, Esc / bấm nền = huỷ.
 */
export function useConfirm(): [ReactNode, (o: ConfirmOptions) => Promise<boolean>] {
  const t = useT()
  const [open, setOpen] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>(resolve => {
    resolver.current?.(false)
    resolver.current = resolve
    setOpen(o)
  }), [])
  const finish = useCallback((ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setOpen(null)
  }, [])
  const cancel = useCallback(() => finish(false), [finish])

  const dialog = open && (
    <Modal title={open.title} onClose={cancel} onSubmit={() => finish(true)}
      footer={
        <div className="ml-auto flex gap-2">
          <Button onClick={cancel}>{t('CANCEL')}</Button>
          <Button type="submit" variant={open.tone ?? 'danger'} selected>{open.confirmLabel}</Button>
        </div>
      }>
      <div className="text-sm text-foreground">{open.message}</div>
    </Modal>
  )
  return [dialog, confirm]
}

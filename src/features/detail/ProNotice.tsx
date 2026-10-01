import { Button } from '@/components/ui/Button'
import { openLicensePage } from '@/services/license'
import { t } from '@/i18n'

/** Báo tính năng thuộc bản Pro (đang ở bản Free) kèm nút mở trang license. */
export function ProNotice({ children }: { children?: string }) {
  return (
    <div className="mb-3 flex flex-col gap-2 rounded-sm border border-primary/30 bg-primary/[0.06] px-3 py-2">
      <p className="font-mono text-[10px] leading-snug text-primary">{children ?? t('This is a MikMaster Pro feature. Enter a license key to unlock preview and parameter control.')}</p>
      <Button size="xs" variant="primary" className="self-start" onClick={openLicensePage}>{t('UNLOCK PRO')}</Button>
    </div>
  )
}

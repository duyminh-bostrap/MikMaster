import { Power } from 'lucide-react'
import { AppLogo } from '@/components/layout/AppLogo'
import { Button } from '@/components/ui/Button'
import { useGateway } from '@/store/useGateway'
import { t } from '@/i18n'

/** Sau khi Quit MikMaster: nói rõ app đã tắt, thay vì để giao diện tiếp tục như thể còn điều khiển được. */
export function StoppedScreen() {
  const { stopped, retry } = useGateway()
  if (!stopped) return null
  return (
    <div role="alertdialog" aria-label={t('MikMaster has stopped')} className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-background p-8 text-center">
      <AppLogo size="lg" />
      <div className="flex size-14 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground"><Power size={22} /></div>
      <div>
        <h1 className="mb-2 text-xl font-semibold text-foreground">{t('MikMaster has stopped')}</h1>
        <p className="max-w-md text-sm text-muted-foreground">You can close this tab. To use MikMaster again, open the MikMaster app (or run it again), then reconnect.</p>
      </div>
      <Button variant="secondary" onClick={retry}>{t('RECONNECT')}</Button>
    </div>
  )
}

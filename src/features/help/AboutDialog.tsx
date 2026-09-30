import { AppLogo } from '@/components/layout/AppLogo'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useT } from '@/i18n'
import { useGateway } from '@/store/useGateway'

/** Phiên bản, chế độ đang chạy, giao thức hỗ trợ. */
export function AboutDialog({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { mode } = useGateway()
  const modeText = mode === 'live' ? t('Live — connected to the gateway') : mode === 'locked' ? t('Gateway locked — access token needed') : mode === 'checking' ? t('Checking…') : t('Simulated — no gateway')
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-4 py-0.5 font-mono text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right text-foreground">{value}</span>
    </div>
  )
  return (
    <Modal title={t('ABOUT MIKMASTER')} onClose={onClose} onSubmit={onClose}
      footer={<Button type="submit" variant="primary" className="ml-auto px-6">{t('CLOSE')}</Button>}>
      <div className="flex items-center gap-3">
        <AppLogo size="lg" />
        <span className="font-mono text-xs text-muted-foreground">v{__APP_VERSION__}</span>
      </div>
      <p className="text-sm text-foreground">{t('Control and monitor AV projectors by project and group.')}</p>
      <div>
        {row(t('Version'), __APP_VERSION__)}
        {row(t('Mode'), modeText)}
        {row(t('Address'), window.location.host)}
        {row(t('Protocols'), 'PJLink · Panasonic NTCONTROL · Christie · TCP/UDP · Art-Net · HTTP')}
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
        {t('Projector drivers are written from published protocol notes and have not yet been verified on every model. Use PING and RAW COMMAND to check a projector.')}
      </p>
    </Modal>
  )
}

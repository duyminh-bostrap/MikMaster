import { Flame } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { dismissAlerts, useHotAlerts } from '@/services/alerts'
import { router } from '@/app/router'
import { TEMP_DANGER } from '@/utils/tones'
import { t } from '@/i18n'

/** Pop-up khi có máy vượt 40°C: liệt kê máy và nhiệt độ; mở trang máy hoặc đóng. */
export function HighTempPopup() {
  const alerts = useHotAlerts()
  if (alerts.length === 0) return null
  const open = (id: string) => { dismissAlerts(); void router.navigate(`/project/projectors/${id}`) }
  return (
    <Modal title={t('HIGH TEMPERATURE')} onClose={dismissAlerts} onSubmit={dismissAlerts}
      footer={<Button type="submit" variant="primary" className="ml-auto">{t('DISMISS')}</Button>}>
      <div role="alert" className="flex items-start gap-3 rounded-sm border border-danger/40 bg-danger/10 p-3">
        <Flame size={22} className="mt-0.5 shrink-0 text-danger" />
        <p className="font-mono text-xs leading-relaxed text-foreground">{t('Above {t}°C: {n} projector(s). Check the cooling and the room before continuing.', { n: alerts.length, t: TEMP_DANGER })}</p>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-sm border border-border">
        {alerts.map(a => (
          <li key={a.projectorId} data-testid="hot-alert" className="flex items-center gap-3 px-3 py-2 font-mono text-xs">
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-foreground">{a.name}</span><span className="text-[10px] text-muted-foreground">{a.projectorId} · {a.ip}</span></span>
            <span className="text-lg font-bold text-danger tabular-nums">{a.tempC}°C</span>
            <Button type="button" size="xs" onClick={() => open(a.projectorId)}>{t('OPEN')}</Button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

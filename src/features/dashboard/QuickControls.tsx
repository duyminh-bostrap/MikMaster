import { Ban, Power, PowerOff, SunMedium } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useT } from '@/i18n'
import { useSettings } from '@/services/settings'
import { useProjectActions } from '@/store/hooks'

/**
 * Bật / tắt / shutter cả một booth. Chỉ đặt trong trang của booth (không ở sidebar, để khó bấm nhầm).
 * Tắt máy và đóng shutter hàng loạt đều hỏi xác nhận; bật thì bật lần lượt theo cài đặt.
 */
export function QuickControls({ projectorIds, boothName }: { projectorIds: string[]; boothName: string }) {
  const t = useT()
  const { setPower, setShutter } = useProjectActions()
  const { powerOnDelaySec } = useSettings()
  const [confirmDialog, confirm] = useConfirm()
  const n = projectorIds.length
  const disabled = n === 0

  async function allOff() {
    const ok = await confirm({
      title: t('TURN OFF PROJECTORS'),
      message: t('Turn off all {n} projectors in "{booth}"? Their image goes dark.', { n, booth: boothName }),
      confirmLabel: t('TURN OFF'),
    })
    if (ok) setPower(projectorIds, 'standby')
  }

  async function closeShutters() {
    const ok = await confirm({
      title: t('CLOSE SHUTTERS'),
      message: t('Close the shutter on all {n} projectors in "{booth}"? Their image is blanked.', { n, booth: boothName }),
      confirmLabel: t('CLOSE SHUTTERS'),
      tone: 'warn',
    })
    if (ok) setShutter(projectorIds, true)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ok" disabled={disabled} onClick={() => setPower(projectorIds, 'on')}
        title={n > 1 && powerOnDelaySec > 0 ? t('One by one, {s} s apart (Settings)', { s: powerOnDelaySec }) : undefined}>
        <Power size={11} />{t('ALL ON')}
        {n > 1 && powerOnDelaySec > 0 && <span className="font-normal opacity-70">· {powerOnDelaySec}s</span>}
      </Button>
      <Button variant="secondary" disabled={disabled} onClick={() => void allOff()}><PowerOff size={11} />{t('ALL OFF')}</Button>
      <div className="h-4 w-px bg-border" />
      <Button variant="warn" disabled={disabled} onClick={() => void closeShutters()}><Ban size={11} />{t('SHUTTER CLOSE')}</Button>
      <Button variant="secondary" disabled={disabled} onClick={() => setShutter(projectorIds, false)}><SunMedium size={11} />{t('SHUTTER OPEN')}</Button>
      {confirmDialog}
    </div>
  )
}

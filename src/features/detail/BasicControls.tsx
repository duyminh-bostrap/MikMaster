import { Ban, Power } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useT } from '@/i18n'
import { useProjectActions } from '@/store/hooks'
import type { Projector } from '@/types'

/** Power · Shutter · OSD on/off. Tắt máy hỏi xác nhận. OSD chưa có lệnh đã xác minh nên chỉ đổi trạng thái trong app. */
export function BasicControls({ projector: p }: { projector: Projector }) {
  const t = useT()
  const { setPower, setShutter, updateProjector } = useProjectActions()
  const [confirmDialog, confirm] = useConfirm()
  const osdOn = p.osd !== false
  const isOff = p.power === 'standby' || p.power === 'off'

  async function turnOff() {
    if (isOff) return
    const ok = await confirm({ title: t('TURN OFF PROJECTOR'), message: t('Turn off {name}? Its image goes dark.', { name: p.name }), confirmLabel: t('TURN OFF') })
    if (ok) setPower([p.id], 'standby')
  }

  return (
    <>
      <SectionHeader label={t('POWER')} />
      <div className="mb-5 flex gap-2">
        <Button size="md" variant="ok" selected={p.power === 'on'} className="flex-1" onClick={() => setPower([p.id], 'on')}>
          <Power size={12} strokeWidth={2.5} />{t('ON')}
        </Button>
        <Button size="md" variant="warn" selected={isOff} className="flex-1" onClick={() => void turnOff()}>
          {t('OFF')}
        </Button>
      </div>

      <SectionHeader label={t('SHUTTER / BLANK')} />
      <Button size="md" variant="warn" selected={p.shutter} className="mb-5 w-full tracking-[0.06em]" onClick={() => setShutter([p.id], !p.shutter)}>
        <Ban size={13} />
        {p.shutter ? t('SHUTTER CLOSED') : t('SHUTTER OPEN')}
      </Button>

      <SectionHeader label={t('OSD')} />
      <div className="mb-5 flex gap-2">
        <Button size="md" variant="ok" selected={osdOn} className="flex-1" onClick={() => updateProjector(p.id, { osd: true })}>{t('ON')}</Button>
        <Button size="md" variant="secondary" selected={!osdOn} className="flex-1" onClick={() => updateProjector(p.id, { osd: false })}>{t('OFF')}</Button>
      </div>
      {confirmDialog}
    </>
  )
}

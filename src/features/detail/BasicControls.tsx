import { Ban, Power } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useEdition } from '@/hooks/useEdition'
import { cn } from '@/utils/cn'
import { powerDisplay } from '@/utils/projector'
import { TONE_TEXT } from '@/utils/tones'
import { useT } from '@/i18n'
import { useProjectActions } from '@/store/hooks'
import type { Projector } from '@/types'

/** Power · Shutter · OSD on/off. Tắt máy hỏi xác nhận. OSD gửi tới máy nếu driver có lệnh (Christie), còn lại chỉ đổi trạng thái trong app. */
export function BasicControls({ projector: p }: { projector: Projector }) {
  const t = useT()
  const { free } = useEdition()
  const { setPower, setShutter, setOsdMany } = useProjectActions()
  const [confirmDialog, confirm] = useConfirm()
  const osdOn = p.osd !== false
  const isOff = p.power === 'standby' || p.power === 'off'
  const display = powerDisplay(p.power)

  async function turnOff() {
    if (isOff) return
    const ok = await confirm({ title: t('TURN OFF PROJECTOR'), message: t('Turn off {name}? Its image goes dark.', { name: p.name }), confirmLabel: t('TURN OFF') })
    if (ok) setPower([p.id], 'standby')
  }

  return (
    <>
      <SectionHeader label={t('POWER')} />
      <div className="mb-5 flex gap-2">
        <Button size="md" variant="ok" selected={p.power === 'on' || p.power === 'warmup'} className="flex-1" onClick={() => setPower([p.id], 'on')}>
          <Power size={12} strokeWidth={2.5} />{t('ON')}
        </Button>
        <Button size="md" variant="warn" selected={isOff || p.power === 'cooling'} className="flex-1" onClick={() => void turnOff()}>
          {t('OFF')}
        </Button>
      </div>
      {/* Trạng thái nguồn thật: lệnh gửi thành công → WARMING UP / COOLING DOWN, máy xác nhận → ON / OFF. */}
      <p data-testid="power-status" className={cn('-mt-3 mb-5 font-mono text-[10px] tracking-[0.1em]', TONE_TEXT[display.tone], (p.power === 'warmup' || p.power === 'cooling') && 'animate-pulse')}>{t(display.label)}{p.power === 'warmup' || p.power === 'cooling' ? '…' : ''}</p>

      <SectionHeader label={t('SHUTTER / BLANK')} />
      <Button size="md" variant="warn" selected={p.shutter} className="mb-5 w-full tracking-[0.06em]" onClick={() => setShutter([p.id], !p.shutter)}>
        <Ban size={13} />
        {p.shutter ? t('SHUTTER CLOSED') : t('SHUTTER OPEN')}
      </Button>

      <SectionHeader label={free ? `${t('OSD')} · PRO` : t('OSD')} />
      <div className="mb-5 flex gap-2">
        <Button size="md" variant="ok" selected={osdOn} disabled={free} className="flex-1" onClick={() => setOsdMany([p.id], true)}>{t('ON')}</Button>
        <Button size="md" variant="secondary" selected={!osdOn} disabled={free} className="flex-1" onClick={() => setOsdMany([p.id], false)}>{t('OFF')}</Button>
      </div>
      {confirmDialog}
    </>
  )
}

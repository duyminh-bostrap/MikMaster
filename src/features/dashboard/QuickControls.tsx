import { Ban, Grid3x3, Power, PowerOff, SunMedium } from 'lucide-react'
import { useState } from 'react'
import { TEST_PATTERNS } from '@/constants/testPatterns'
import type { TestPatternType } from '@/types'
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
  const { setPower, setShutter, setTestPatternMany } = useProjectActions()
  const [pattern, setPattern] = useState<TestPatternType>('grid')
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

  async function patternOn() {
    const ok = await confirm({
      title: t('SHOW TEST PATTERN'),
      message: t('Show the "{pattern}" test pattern on all {n} projectors in "{booth}"? It replaces the image.', { n, booth: boothName, pattern: t(TEST_PATTERNS.find(x => x.type === pattern)?.label ?? pattern) }),
      confirmLabel: t('SHOW PATTERN'),
      tone: 'accent',
    })
    if (ok) setTestPatternMany(projectorIds, { enabled: true, type: pattern })
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
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-1">
        <select aria-label={t('Test pattern')} value={pattern} onChange={e => setPattern(e.target.value as TestPatternType)} disabled={disabled}
          className="rounded-sm border border-border bg-muted px-1.5 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary/60">
          {TEST_PATTERNS.map(p => <option key={p.type} value={p.type}>{t(p.label)}</option>)}
        </select>
        <Button variant="accent" disabled={disabled} onClick={() => void patternOn()}><Grid3x3 size={11} />{t('PATTERN ON')}</Button>
        <Button variant="secondary" disabled={disabled} onClick={() => setTestPatternMany(projectorIds, { enabled: false })}>{t('PATTERN OFF')}</Button>
      </div>
      {confirmDialog}
    </div>
  )
}

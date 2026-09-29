import { Captions, CaptionsOff, Eye, EyeOff, Grid3x3, Power, PowerOff, SquareDashed, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { TEST_PATTERNS } from '@/constants/testPatterns'
import { useT } from '@/i18n'
import { useSettings } from '@/services/settings'
import { useProjectActions } from '@/store/hooks'
import { cn } from '@/utils/cn'
import type { TestPatternType } from '@/types'

type Tone = 'ok' | 'neutral' | 'warn' | 'accent'

const TONE: Record<Tone, string> = {
  ok: 'text-ok hover:bg-ok/15',
  neutral: 'text-foreground/80 hover:bg-elevated-hover',
  warn: 'text-warn hover:bg-warn/15',
  accent: 'text-accent hover:bg-accent/15',
}

/** Nút chỉ có icon; ý nghĩa nằm ở tooltip + aria-label. `badge` = chữ nhỏ ở góc (ví dụ "5s"). */
function IconButton({ icon: Icon, label, tone, onClick, disabled, badge }: {
  icon: LucideIcon
  label: string
  tone: Tone
  onClick: () => void
  disabled?: boolean
  badge?: string
}) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      className={cn('relative flex size-8 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40', TONE[tone])}>
      <Icon size={15} strokeWidth={2} />
      {badge && <span className="absolute -top-1 -right-1 rounded-full bg-ok px-1 font-mono text-[8px] leading-3 text-background">{badge}</span>}
    </button>
  )
}

/** Nhóm nút dính liền, có nhãn nhỏ phía trên. */
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[9px] tracking-[0.1em] text-muted-foreground">{label}</span>
      <div className="flex items-center divide-x divide-border overflow-visible rounded-sm border border-border bg-card">{children}</div>
    </div>
  )
}

/**
 * Điều khiển hàng loạt cho cả project (tab Tất cả) hoặc một booth: nguồn, shutter, OSD, test pattern.
 * Tắt máy, đóng shutter và hiện test pattern đều hỏi xác nhận; bật máy thì bật lần lượt theo cài đặt.
 */
export function QuickControls({ projectorIds, scopeLabel }: { projectorIds: string[]; scopeLabel: string }) {
  const t = useT()
  const { setPower, setShutter, setOsdMany, setTestPatternMany } = useProjectActions()
  const { powerOnDelaySec } = useSettings()
  const [confirmDialog, confirm] = useConfirm()
  const [pattern, setPattern] = useState<TestPatternType>('grid')
  const n = projectorIds.length
  const disabled = n === 0
  const stagger = n > 1 && powerOnDelaySec > 0
  const vars = { n, booth: scopeLabel }

  async function allOff() {
    if (await confirm({ title: t('TURN OFF PROJECTORS'), message: t('Turn off all {n} projectors in "{booth}"? Their image goes dark.', vars), confirmLabel: t('TURN OFF') })) {
      setPower(projectorIds, 'standby')
    }
  }
  async function closeShutters() {
    if (await confirm({ title: t('CLOSE SHUTTERS'), message: t('Close the shutter on all {n} projectors in "{booth}"? Their image is blanked.', vars), confirmLabel: t('CLOSE SHUTTERS'), tone: 'warn' })) {
      setShutter(projectorIds, true)
    }
  }
  async function patternOn() {
    const name = t(TEST_PATTERNS.find(x => x.type === pattern)?.label ?? pattern)
    if (await confirm({ title: t('SHOW TEST PATTERN'), message: t('Show the "{pattern}" test pattern on all {n} projectors in "{booth}"? It replaces the image.', { ...vars, pattern: name }), confirmLabel: t('SHOW PATTERN'), tone: 'accent' })) {
      setTestPatternMany(projectorIds, { enabled: true, type: pattern })
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Group label={t('POWER')}>
        <IconButton icon={Power} tone="ok" disabled={disabled} onClick={() => setPower(projectorIds, 'on')}
          label={stagger ? t('All on — one by one, {s} s apart (Settings)', { s: powerOnDelaySec }) : t('All on')} badge={stagger ? `${powerOnDelaySec}s` : undefined} />
        <IconButton icon={PowerOff} tone="neutral" disabled={disabled} onClick={() => void allOff()} label={t('All off')} />
      </Group>
      <Group label={t('SHUTTER')}>
        <IconButton icon={Eye} tone="neutral" disabled={disabled} onClick={() => setShutter(projectorIds, false)} label={t('Open all shutters (show image)')} />
        <IconButton icon={EyeOff} tone="warn" disabled={disabled} onClick={() => void closeShutters()} label={t('Close all shutters (blank image)')} />
      </Group>
      <Group label={t('OSD')}>
        <IconButton icon={Captions} tone="neutral" disabled={disabled} onClick={() => setOsdMany(projectorIds, true)} label={t('OSD on for all')} />
        <IconButton icon={CaptionsOff} tone="neutral" disabled={disabled} onClick={() => setOsdMany(projectorIds, false)} label={t('OSD off for all')} />
      </Group>
      <Group label={t('TEST PATTERN')}>
        <select aria-label={t('Test pattern')} value={pattern} disabled={disabled} onChange={e => setPattern(e.target.value as TestPatternType)}
          className="h-8 bg-transparent px-2 font-mono text-[11px] text-foreground outline-none">
          {TEST_PATTERNS.map(p => <option key={p.type} value={p.type}>{t(p.label)}</option>)}
        </select>
        <IconButton icon={Grid3x3} tone="accent" disabled={disabled} onClick={() => void patternOn()} label={t('Show test pattern on all')} />
        <IconButton icon={SquareDashed} tone="neutral" disabled={disabled} onClick={() => setTestPatternMany(projectorIds, { enabled: false })} label={t('Hide test pattern on all')} />
      </Group>
      {confirmDialog}
    </div>
  )
}

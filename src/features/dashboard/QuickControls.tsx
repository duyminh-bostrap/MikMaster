import { Captions, CaptionsOff, Eye, EyeOff, Grid3x3, Moon, Power, SquareDashed, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { TEST_PATTERNS } from '@/constants/testPatterns'
import { useEdition } from '@/hooks/useEdition'
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

/** Nút nổi bật (bật / tắt toàn bộ): nền đặc, to hơn. */
const SOLID: Record<'ok' | 'danger', string> = {
  ok: 'bg-ok text-background shadow-[0_0_14px_-4px_var(--color-ok)] hover:brightness-110',
  danger: 'bg-danger text-background shadow-[0_0_14px_-4px_var(--color-danger)] hover:brightness-110',
}

/** Nút chỉ có icon; ý nghĩa nằm ở tooltip + aria-label. `badge` = chữ nhỏ ở góc (ví dụ "5s"). */
function IconButton({ icon: Icon, label, tone, onClick, disabled, badge, solid }: {
  icon: LucideIcon
  label: string
  tone: Tone
  onClick: () => void
  disabled?: boolean
  badge?: string
  /** Nút chính: to, nền đặc (tone 'ok' hoặc 'danger'). */
  solid?: 'ok' | 'danger'
}) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      className={cn('relative flex items-center justify-center transition disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
        solid ? cn('size-10 rounded-sm', SOLID[solid]) : cn('size-8', TONE[tone]))}>
      <Icon size={solid ? 20 : 15} strokeWidth={solid ? 2.5 : 2} />
      {badge && <span className="absolute -top-1.5 -right-1.5 rounded-full border border-background bg-foreground px-1 font-mono text-[8px] leading-3 text-background">{badge}</span>}
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

/** Nút bật / tắt toàn bộ — đặt đầu thanh số liệu (bên trái). Tắt hỏi xác nhận; bật thì bật lần lượt theo cài đặt. */
export function PowerControls({ projectorIds, scopeLabel }: { projectorIds: string[]; scopeLabel: string }) {
  const t = useT()
  const { setPower } = useProjectActions()
  const { powerOnDelaySec } = useSettings()
  const [confirmDialog, confirm] = useConfirm()
  const n = projectorIds.length
  const stagger = n > 1 && powerOnDelaySec > 0

  async function allOff() {
    if (await confirm({ title: t('TURN OFF PROJECTORS'), message: t('Turn off all {n} projectors in "{booth}"? Their image goes dark.', { n, booth: scopeLabel }), confirmLabel: t('TURN OFF') })) {
      setPower(projectorIds, 'standby')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <IconButton icon={Power} tone="ok" solid="ok" disabled={n === 0} onClick={() => setPower(projectorIds, 'on')}
        label={stagger ? t('All on — one by one, {s} s apart (Settings)', { s: powerOnDelaySec }) : t('All on')} badge={stagger ? `${powerOnDelaySec}s` : undefined} />
      <IconButton icon={Moon} tone="neutral" solid="danger" disabled={n === 0} onClick={() => void allOff()} label={t('All off')} />
      {confirmDialog}
    </div>
  )
}

/**
 * Điều khiển hàng loạt cho cả project (tab Tất cả) hoặc một booth: shutter, OSD, test pattern.
 * Đóng shutter và hiện test pattern hỏi xác nhận.
 */
export function QuickControls({ projectorIds, scopeLabel }: { projectorIds: string[]; scopeLabel: string }) {
  const t = useT()
  const { free } = useEdition() // OSD và test pattern là tính năng Pro
  const { setShutter, setOsdMany, setTestPatternMany } = useProjectActions()
  const [confirmDialog, confirm] = useConfirm()
  const [pattern, setPattern] = useState<TestPatternType>('grid')
  const n = projectorIds.length
  const disabled = n === 0
  const vars = { n, booth: scopeLabel }

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
      <Group label={t('SHUTTER')}>
        <IconButton icon={Eye} tone="neutral" disabled={disabled} onClick={() => setShutter(projectorIds, false)} label={t('Open all shutters (show image)')} />
        <IconButton icon={EyeOff} tone="warn" disabled={disabled} onClick={() => void closeShutters()} label={t('Close all shutters (blank image)')} />
      </Group>
      <Group label={free ? `${t('OSD')} · PRO` : t('OSD')}>
        <IconButton icon={Captions} tone="neutral" disabled={disabled || free} onClick={() => setOsdMany(projectorIds, true)} label={t('OSD on for all')} />
        <IconButton icon={CaptionsOff} tone="neutral" disabled={disabled || free} onClick={() => setOsdMany(projectorIds, false)} label={t('OSD off for all')} />
      </Group>
      <Group label={free ? `${t('TEST PATTERN')} · PRO` : t('TEST PATTERN')}>
        <select aria-label={t('Test pattern')} value={pattern} disabled={disabled || free} onChange={e => setPattern(e.target.value as TestPatternType)}
          className="h-8 bg-transparent px-2 font-mono text-[11px] text-foreground outline-none">
          {TEST_PATTERNS.map(p => <option key={p.type} value={p.type}>{t(p.label)}</option>)}
        </select>
        <IconButton icon={Grid3x3} tone="accent" disabled={disabled || free} onClick={() => void patternOn()} label={t('Show test pattern on all')} />
        <IconButton icon={SquareDashed} tone="neutral" disabled={disabled || free} onClick={() => setTestPatternMany(projectorIds, { enabled: false })} label={t('Hide test pattern on all')} />
      </Group>
      {confirmDialog}
    </div>
  )
}

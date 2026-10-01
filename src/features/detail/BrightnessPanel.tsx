import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useProjectActions } from '@/store/hooks'
import type { Projector } from '@/types'
import { t } from '@/i18n'

export const BRIGHTNESS_STEP = 5
const QUICK = [25, 50, 75, 100] as const
const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)))

/** Độ sáng 0–100%: thanh trượt, nút −/+ và các mức nhanh. Chỉ dùng được khi máy đang bật. */
export function BrightnessPanel({ projector: p }: { projector: Projector }) {
  const { updateProjector } = useProjectActions()
  const value = p.telemetry.brightness
  const on = p.power === 'on'
  const set = (n: number) => updateProjector(p.id, { telemetry: { ...p.telemetry, brightness: clamp(n) } })

  return (
    <fieldset disabled={!on} className="contents">
      <SectionHeader label={t('BRIGHTNESS')} />
      <div className="mb-5 flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5">
          <Button size="md" aria-label={t('Brightness down')} onClick={() => set(value - BRIGHTNESS_STEP)}><Minus size={12} /></Button>
          <input type="range" min={0} max={100} step={1} value={value} aria-label={t('BRIGHTNESS')}
            onChange={e => set(Number(e.target.value))} className="h-1 min-w-0 flex-1 cursor-pointer accent-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40" />
          <Button size="md" aria-label={t('Brightness up')} onClick={() => set(value + BRIGHTNESS_STEP)}><Plus size={12} /></Button>
          <span className="w-10 text-right font-mono text-sm tabular-nums text-foreground" aria-live="polite">{value}%</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {QUICK.map(q => (
            <Button key={q} size="xs" variant={value === q ? 'primary' : 'secondary'} aria-label={`${t('BRIGHTNESS')} ${q}%`} onClick={() => set(q)}>{q}%</Button>
          ))}
        </div>
        {!on && <p className="font-mono text-[10px] text-muted-foreground">{t('Turn the projector on to change the brightness.')}</p>}
      </div>
    </fieldset>
  )
}

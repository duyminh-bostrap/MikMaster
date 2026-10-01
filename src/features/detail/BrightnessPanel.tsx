import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useProjectActions } from '@/store/hooks'
import type { Projector } from '@/types'
import { t } from '@/i18n'

export const BRIGHTNESS_STEP = 5
const QUICK = [25, 50, 75, 100] as const
const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)))

/**
 * Độ sáng 0–100%: thanh trượt, nút −/+ và các mức nhanh. Chỉ dùng được khi máy đang bật.
 * Kéo thanh trượt chỉ đổi số hiển thị; lệnh gửi tới máy khi THẢ thanh trượt (không gửi từng bước khi đang kéo).
 */
export function BrightnessPanel({ projector: p }: { projector: Projector }) {
  const { setBrightness } = useProjectActions()
  const value = p.telemetry.brightness
  const on = p.power === 'on'
  const [drag, setDrag] = useState<number | null>(null)
  const shown = drag ?? value
  const send = (n: number) => { setDrag(null); setBrightness(p.id, clamp(n), p) }

  return (
    <fieldset disabled={!on} className="contents">
      <SectionHeader label={t('BRIGHTNESS')} />
      <div className="mb-5 flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5">
          <Button size="md" aria-label={t('Brightness down')} onClick={() => send(shown - BRIGHTNESS_STEP)}><Minus size={12} /></Button>
          <input type="range" min={0} max={100} step={1} value={shown} aria-label={t('BRIGHTNESS')}
            onChange={e => setDrag(Number(e.target.value))}
            onPointerUp={e => send(Number((e.target as HTMLInputElement).value))}
            onKeyUp={e => { if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End' || e.key.startsWith('Page')) send(Number((e.target as HTMLInputElement).value)) }}
            onBlur={() => { if (drag !== null) send(drag) }}
            className="h-1 min-w-0 flex-1 cursor-pointer accent-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40" />
          <Button size="md" aria-label={t('Brightness up')} onClick={() => send(shown + BRIGHTNESS_STEP)}><Plus size={12} /></Button>
          <span className="w-10 text-right font-mono text-sm tabular-nums text-foreground" aria-live="polite">{shown}%</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {QUICK.map(q => (
            <Button key={q} size="xs" variant={shown === q ? 'primary' : 'secondary'} aria-label={`${t('BRIGHTNESS')} ${q}%`} onClick={() => send(q)}>{q}%</Button>
          ))}
        </div>
        {!on && <p className="font-mono text-[10px] text-muted-foreground">{t('Turn the projector on to change the brightness.')}</p>}
      </div>
    </fieldset>
  )
}

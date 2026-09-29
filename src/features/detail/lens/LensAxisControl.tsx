import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { Tone } from '@/utils/tones'

/** Một trục 0–100% (Zoom hoặc Focus) với hai nút giảm/tăng. */
export function LensAxisControl({ label, value, decLabel, incLabel, onDec, onInc, tone }: {
  label: string
  value: number
  decLabel: string
  incLabel: string
  onDec: () => void
  onInc: () => void
  tone: Tone
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between font-mono">
        <span className="text-[10px] tracking-[0.08em] text-muted-foreground">{label}</span>
        <span className="text-xs text-foreground">{value}%</span>
      </div>
      <div className="flex gap-1">
        <Button size="md" className="flex-1 font-bold" aria-label={`${label} ${decLabel}`} onClick={onDec}>{decLabel}</Button>
        <Button size="md" className="flex-1 font-bold" aria-label={`${label} ${incLabel}`} onClick={onInc}>{incLabel}</Button>
      </div>
      <ProgressBar value={value} tone={tone} className="mt-2" />
    </div>
  )
}

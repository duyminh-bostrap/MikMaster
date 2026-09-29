import { cn } from '@/utils/cn'
import { TONE_BG, type Tone } from '@/utils/tones'

export function ProgressBar({ value, tone = 'accent', className }: { value: number; tone?: Tone; className?: string }) {
  return (
    <div className={cn('h-0.5 rounded-full bg-border', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-all duration-300', TONE_BG[tone])} style={{ width: `${value}%` }} />
    </div>
  )
}

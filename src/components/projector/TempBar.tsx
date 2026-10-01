import { ProgressBar } from '@/components/ui/ProgressBar'
import { TEMP_RANGE, TONE_TEXT, temperatureTone } from '@/utils/tones'
import { cn } from '@/utils/cn'
import { t } from '@/i18n'


export function TempBar({ tempC }: { tempC: number }) {
  if (tempC <= 0) return <span className="font-mono text-xs text-muted-foreground">{t('Temp —')}</span>
  const tone = temperatureTone(tempC)
  return (
    <div className="flex items-center gap-2">
      <ProgressBar value={Math.min(100, Math.max(4, ((tempC - TEMP_RANGE.min) / (TEMP_RANGE.max - TEMP_RANGE.min)) * 100))} tone={tone} className="flex-1" />
      <span className={cn('min-w-8 font-mono text-xs', TONE_TEXT[tone])}>{tempC}°C</span>
    </div>
  )
}

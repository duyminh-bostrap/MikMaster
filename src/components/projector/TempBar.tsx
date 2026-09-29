import { ProgressBar } from '@/components/ui/ProgressBar'
import { TONE_TEXT, temperatureTone } from '@/utils/tones'
import { cn } from '@/utils/cn'
import { t } from '@/i18n'

const MAX_TEMP = 90

export function TempBar({ tempC }: { tempC: number }) {
  if (tempC <= 0) return <span className="font-mono text-xs text-muted-foreground">{t('Temp —')}</span>
  const tone = temperatureTone(tempC)
  return (
    <div className="flex items-center gap-2">
      <ProgressBar value={Math.min((tempC / MAX_TEMP) * 100, 100)} tone={tone} className="flex-1" />
      <span className={cn('min-w-8 font-mono text-xs', TONE_TEXT[tone])}>{tempC}°C</span>
    </div>
  )
}

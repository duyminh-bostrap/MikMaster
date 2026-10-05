import { AlertTriangle, Flame, ThermometerSun } from 'lucide-react'
import { useT } from '@/i18n'
import type { Projector } from '@/types'
import { cn } from '@/utils/cn'
import { collectWarnings } from '@/utils/warnings'

const MAX_SHOWN = 6

/**
 * Dải cảnh báo dưới hàng điều khiển: hiện khi có máy báo LỖI hoặc NHIỆT ĐỘ CAO (> 33°C cảnh báo, > 40°C nguy hiểm).
 * Mỗi mục bấm được để mở trang máy; không có cảnh báo thì không hiện gì.
 */
export function WarningBanner({ projectors, onOpen }: { projectors: Projector[]; onOpen: (id: string) => void }) {
  const t = useT()
  const warnings = collectWarnings(projectors)
  if (warnings.length === 0) return null
  const danger = warnings.some(w => w.kind !== 'warm')
  const shown = warnings.slice(0, MAX_SHOWN)
  return (
    <div role="region" aria-label={t('Warnings')} data-testid="warning-banner"
      className={cn('flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-b px-5 py-2 font-mono text-xs', danger ? 'border-danger/40 bg-danger/10' : 'border-warn/40 bg-warn/10')}>
      <span className={cn('flex items-center gap-1.5 font-bold tracking-[0.08em]', danger ? 'text-danger' : 'text-warn')}>
        <AlertTriangle size={14} />{t('{n} WARNING(S)', { n: warnings.length })}
      </span>
      {shown.map((w, i) => {
        const Icon = w.kind === 'hot' ? Flame : w.kind === 'warm' ? ThermometerSun : AlertTriangle
        return (
          <button key={`${w.projector.id}:${w.kind}:${i}`} type="button" data-warning={w.kind} onClick={() => onOpen(w.projector.id)}
            className={cn('flex items-center gap-1.5 hover:underline', w.kind === 'warm' ? 'text-warn' : 'text-danger')}>
            <Icon size={12} />
            <span className="font-semibold text-foreground">{w.projector.name}</span>
            <span>{w.kind === 'hot' ? `${w.text} > 40°C` : w.kind === 'warm' ? `${w.text} > 33°C` : w.text}</span>
          </button>
        )
      })}
      {warnings.length > shown.length && <span className="text-muted-foreground">{t('+{n} more', { n: warnings.length - shown.length })}</span>}
    </div>
  )
}

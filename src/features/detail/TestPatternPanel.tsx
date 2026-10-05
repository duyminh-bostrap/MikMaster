import { TestPatternOverlay } from '@/components/projector/TestPatternOverlay'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { TEST_PATTERNS } from '@/constants/testPatterns'
import { supportsTestPattern } from '../../../shared/api.ts'
import { useGateway } from '@/store/useGateway'
import { useProjectActions } from '@/store/hooks'
import type { Projector } from '@/types'
import { t } from '@/i18n'

/** Bật/tắt và chọn Test Pattern. Cần máy đang bật; Shutter đóng sẽ che pattern (giống máy thật). */
export function TestPatternPanel({ projector: p }: { projector: Projector }) {
  const { setTestPattern } = useProjectActions()
  const { enabled, type } = p.testPattern
  const disabled = p.power !== 'on'
  const { gateway } = useGateway()
  // Điều khiển thật: mẫu mà máy này không có lệnh thì mờ đi (mô phỏng: mẫu nào cũng dùng được).
  const supported = (type: string) => !gateway || supportsTestPattern(p.network.protocol.type, type)

  return (
    <div>
      <SectionHeader label={t('TEST PATTERN')} />
      <Button size="md" variant="accent" selected={enabled} disabled={disabled} className="mb-3 w-full tracking-[0.06em]" onClick={() => setTestPattern(p.id, { enabled: !enabled })}>
        {enabled ? t('PATTERN ON') : t('PATTERN OFF')}
      </Button>
      <div className="grid grid-cols-5 gap-1.5 max-xl:grid-cols-4" role="group" aria-label={t('Pattern type')}>
        {TEST_PATTERNS.map(pattern => (
          <button
            key={pattern.type}
            type="button"
            title={supported(pattern.type) ? pattern.label : `${pattern.label} — ${t('not available on this projector')}`}
            aria-label={pattern.label}
            aria-pressed={type === pattern.type}
            disabled={disabled || !supported(pattern.type)}
            onClick={() => setTestPattern(p.id, { type: pattern.type, enabled: true })}
            className={cn('overflow-hidden rounded-sm border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40', type === pattern.type ? 'border-accent' : 'border-border hover:border-muted-foreground')}
          >
            <div className="relative aspect-video"><TestPatternOverlay type={pattern.type} /></div>
            <div className="truncate bg-secondary px-1 py-0.5 font-mono text-[9px] text-secondary-foreground">{pattern.label}</div>
          </button>
        ))}
      </div>
      {p.shutter && enabled && !disabled && (
        <p className="mt-2 font-mono text-[10px] text-warn">{t('Shutter is closed — pattern is hidden')}</p>
      )}
    </div>
  )
}

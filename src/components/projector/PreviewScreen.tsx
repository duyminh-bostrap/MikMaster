import { Ban } from 'lucide-react'
import { cn } from '@/utils/cn'
import { getPreviewState } from '@/utils/projector'
import type { Projector } from '@/types'
import { TestPatternOverlay } from './TestPatternOverlay'
import { t } from '@/i18n'

const VIGNETTE = 'pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(0_0_0/0.5)_100%)]'

/** Ô mô phỏng hình chiếu. `sm` cho card trên Dashboard, `lg` cho trang Detail. */
export function PreviewScreen({ projector, size }: { projector: Projector; size: 'sm' | 'lg' }) {
  const state = getPreviewState(projector)
  const lg = size === 'lg'
  const { brightness } = projector.telemetry
  const label = 'font-mono tracking-[0.2em]'

  return (
    <div
      className={cn(
        'scanlines relative overflow-hidden',
        lg ? 'aspect-video rounded-sm border border-border' : 'h-[90px]',
        state === 'live' ? 'bg-screen-on' : 'bg-screen-off',
        lg && state === 'live' && 'shadow-[0_0_40px_rgb(6_182_212/0.08),inset_0_0_80px_rgb(6_182_212/0.03)]',
      )}
    >
      {state === 'pattern' && <TestPatternOverlay type={projector.testPattern.type} testId="test-pattern" />}

      {state === 'live' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <div className={cn(label, 'font-medium text-accent/70', lg ? 'text-2xl' : 'text-xs')}>{projector.input}</div>
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
          <div className="flex gap-6 font-mono text-xs">
            <span className="text-ok/70">{brightness}% BRT</span>
            {lg && <span className="text-accent/60">Z:{projector.lens.position.zoom}% F:{projector.lens.position.focus}%</span>}
          </div>
          {lg && projector.lens.activePreset && (
            <div className="mt-2 rounded-sm border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-xs text-primary/80">
              PRESET {projector.lens.activePreset} ACTIVE
            </div>
          )}
        </div>
      )}

      {state === 'standby' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          {lg && <span className="size-3 rounded-full bg-warn/60" />}
          <span className={cn(label, 'text-warn/60', lg ? 'text-sm' : 'text-xs')}>{t('OFF')}</span>
        </div>
      )}

      {state === 'shutter' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          {lg && <Ban size={32} strokeWidth={1.5} className="text-warn/50" />}
          <span className={cn(label, 'text-warn/60', lg ? 'text-sm' : 'text-xs')}>{t('SHUTTER CLOSED')}</span>
        </div>
      )}

      {state === 'nolink' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(label, 'text-danger/60', lg ? 'text-sm' : 'text-xs')}>{t('NO LINK')}</span>
        </div>
      )}

      {state === 'off' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(label, 'text-muted-foreground/40', lg ? 'text-sm' : 'text-xs')}>{lg ? t('NO OUTPUT') : t('OFF')}</span>
        </div>
      )}

      {state !== 'pattern' && <div className={VIGNETTE} />}
    </div>
  )
}

import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { formatShortDate, formatSigned } from '@/utils/format'
import type { LensPreset, LensSlot } from '@/types'
import { t } from '@/i18n'

interface PresetSlotCardProps {
  slot: LensSlot
  preset: LensPreset | null
  isActive: boolean
  onSave: () => void
  onLoad: () => void
  onUnload: () => void
}

export function PresetSlotCard({ slot, preset, isActive, onSave, onLoad, onUnload }: PresetSlotCardProps) {
  return (
    <div className={cn('flex min-h-[110px] flex-col gap-2 rounded-sm border p-3', isActive ? 'border-primary/40 bg-primary/[0.07]' : 'border-border bg-secondary')}>
      <div className="flex items-center justify-between font-mono">
        <div className="flex items-center gap-2">
          <span className={cn('text-lg leading-none font-bold', isActive ? 'text-primary' : 'text-muted-foreground')}>{slot}</span>
          {isActive && <span className="rounded-sm border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[9px] tracking-[0.08em] text-primary">{t('ACTIVE')}</span>}
        </div>
        {preset && !isActive && <span className="text-[9px] text-muted-foreground">{formatShortDate(preset.savedAt).slice(5)}</span>}
      </div>

      {preset ? (
        <div className="flex flex-col gap-1">
          <span className="truncate text-xs font-semibold text-foreground">{preset.name}</span>
          <div className="flex flex-wrap gap-x-2 font-mono text-[9px] text-muted-foreground">
            <span>S {formatSigned(preset.position.shiftX)},{formatSigned(preset.position.shiftY)}</span>
            <span>Z:{preset.position.zoom}%</span>
            <span>F:{preset.position.focus}%</span>
          </div>
        </div>
      ) : (
        <span className="font-mono text-xs tracking-[0.08em] text-muted-foreground/40">{t('— EMPTY —')}</span>
      )}

      <div className="mt-auto flex gap-1">
        {!preset ? (
          <Button variant="warn" className="flex-1 py-1" onClick={onSave}>{t('SAVE')}</Button>
        ) : (
          <>
            {isActive ? (
              <Button className="min-w-0 flex-1 px-1 py-1 text-muted-foreground" onClick={onUnload}>{t('UNLOAD')}</Button>
            ) : (
              <Button variant="accent" className="min-w-0 flex-1 px-1 py-1" onClick={onLoad}>{t('LOAD')}</Button>
            )}
            <Button className="shrink-0 px-1.5 py-1 text-muted-foreground" title={t('Overwrite with current lens position')} onClick={onSave}>{t('OVR')}</Button>
          </>
        )}
      </div>
    </div>
  )
}

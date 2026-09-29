import { ALL_BOOTHS } from '@/hooks/useBoothFilter'
import { cn } from '@/utils/cn'
import type { Booth, Projector } from '@/types'
import { BoothDropZone } from './moveProjector'
import { t } from '@/i18n'

export function BoothTabs({ booths, projectors, active, onSelect, onMoveProjector }: {
  booths: Booth[]
  projectors: Projector[]
  active: string
  onSelect: (boothId: string) => void
  onMoveProjector: (projectorId: string, boothId: string) => void
}) {
  const tabs = [{ id: ALL_BOOTHS, name: t('All'), count: projectors.length }, ...booths.map(b => ({ id: b.id, name: b.name, count: projectors.filter(p => p.boothId === b.id).length }))]
  return (
    <div role="tablist" aria-label={t('Filter by booth')} className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-5 py-2">
      {tabs.map(tab => (
        <BoothDropZone key={tab.id} className="shrink-0" disabled={tab.id === ALL_BOOTHS} onDrop={id => onMoveProjector(id, tab.id)}>
        {over => (
        <button
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onSelect(tab.id)}
          className={cn('shrink-0 rounded-sm border px-3 py-1 font-mono text-xs transition-colors', over ? 'border-accent bg-accent/15 text-foreground' : active === tab.id ? 'border-primary bg-primary text-primary-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
        >
          {tab.name}
          <span className="ml-1.5 opacity-70">{tab.count}</span>
        </button>
        )}
        </BoothDropZone>
      ))}
    </div>
  )
}

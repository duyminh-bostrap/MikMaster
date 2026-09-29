import { ALL_BOOTHS } from '@/hooks/useBoothFilter'
import { cn } from '@/utils/cn'
import type { Booth, Projector } from '@/types'

export function BoothTabs({ booths, projectors, active, onSelect }: {
  booths: Booth[]
  projectors: Projector[]
  active: string
  onSelect: (boothId: string) => void
}) {
  const tabs = [{ id: ALL_BOOTHS, name: 'All', count: projectors.length }, ...booths.map(b => ({ id: b.id, name: b.name, count: projectors.filter(p => p.boothId === b.id).length }))]
  return (
    <div role="tablist" aria-label="Filter by booth" className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-5 py-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onSelect(tab.id)}
          className={cn('shrink-0 rounded-sm border px-3 py-1 font-mono text-xs transition-colors', active === tab.id ? 'border-primary bg-primary text-primary-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
        >
          {tab.name}
          <span className="ml-1.5 opacity-70">{tab.count}</span>
        </button>
      ))}
    </div>
  )
}

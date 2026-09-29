import { ChevronRight, LayoutGrid, Save, Check } from 'lucide-react'
import { useState } from 'react'
import { AppLogo } from '@/components/layout/AppLogo'
import { PowerDot, StatusDot } from '@/components/ui/StatusDot'
import { Button } from '@/components/ui/Button'
import { ALL_BOOTHS } from '@/hooks/useBoothFilter'
import { cn } from '@/utils/cn'
import type { Booth, Project, Projector } from '@/types'
import { QuickControls } from './QuickControls'

interface SidebarProps {
  project: Project
  booths: Booth[]
  projectors: Projector[]
  activeBooth: string
  onSelectBooth: (boothId: string) => void
  onOpenProjector: (id: string) => void
  onSave: () => Promise<boolean>
}

export function Sidebar({ project, booths, projectors, activeBooth, onSelectBooth, onOpenProjector, onSave }: SidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(booths.map(b => b.id)))
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>('idle')

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  async function handleSave() {
    setSaveState((await onSave()) ? 'saved' : 'failed')
    setTimeout(() => setSaveState('idle'), 1800)
  }

  const allActive = activeBooth === ALL_BOOTHS

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <AppLogo />
      </div>

      <div className="border-b border-border px-4 py-3">
        <p className="mb-1 font-mono text-xs tracking-[0.08em] text-muted-foreground">PROJECT</p>
        <p className="mb-0.5 text-sm font-semibold leading-tight text-foreground">{project.name}</p>
        <p className="text-xs leading-tight text-muted-foreground">{project.venue}</p>
      </div>

      <nav aria-label="Booths" className="flex-1 overflow-y-auto py-2">
        <button
          type="button"
          onClick={() => onSelectBooth(ALL_BOOTHS)}
          className={cn('flex w-full items-center justify-between border-l-2 px-4 py-2 text-left transition-colors', allActive ? 'border-primary bg-primary/[0.08]' : 'border-transparent hover:bg-muted')}
        >
          <span className="flex items-center gap-2">
            <LayoutGrid size={12} className={allActive ? 'text-primary' : 'text-muted-foreground'} />
            <span className={cn('text-xs font-medium', allActive ? 'text-primary' : 'text-foreground')}>All Projectors</span>
          </span>
          <span className="font-mono text-xs text-muted-foreground">{projectors.length}</span>
        </button>

        <div className="mx-4 my-2 h-px bg-border" />

        {booths.map(booth => {
          const inBooth = projectors.filter(p => p.boothId === booth.id)
          const online = inBooth.filter(p => p.power === 'on').length
          const hasAlert = inBooth.some(p => p.errors.length > 0)
          const isOpen = expanded.has(booth.id)
          const isActive = activeBooth === booth.id

          return (
            <div key={booth.id}>
              <div
                className={cn('flex cursor-pointer items-center border-l-2 px-3 py-2 transition-colors', isActive ? 'border-primary bg-primary/[0.06]' : 'border-transparent hover:bg-muted')}
                onClick={() => { onSelectBooth(booth.id); toggle(booth.id) }}
              >
                <button
                  type="button"
                  aria-label={isOpen ? `Collapse ${booth.name}` : `Expand ${booth.name}`}
                  aria-expanded={isOpen}
                  onClick={e => { e.stopPropagation(); toggle(booth.id) }}
                  className={cn('mr-1 flex size-4 shrink-0 items-center justify-center text-muted-foreground transition-transform', isOpen && 'rotate-90')}
                >
                  <ChevronRight size={9} strokeWidth={3} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('truncate text-xs font-semibold', isActive ? 'text-primary' : 'text-foreground')}>{booth.name}</span>
                    {hasAlert && <StatusDot tone="danger" className="size-1.5" />}
                  </div>
                  <span className="text-xs text-muted-foreground">{booth.location}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5 font-mono">
                  <span className="text-xs text-muted-foreground">{inBooth.length}</span>
                  <span className="text-[9px] text-ok">{online}↑</span>
                </div>
              </div>

              {isOpen && (
                <>
                  <div className="px-4 pb-1"><QuickControls projectorIds={inBooth.map(p => p.id)} variant="compact" /></div>
                  {inBooth.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onOpenProjector(p.id)}
                      className="flex w-full items-center gap-2 px-4 py-1.5 text-left hover:bg-muted"
                    >
                      <PowerDot power={p.power} />
                      <span className="flex-1 truncate text-xs text-card-foreground">{p.name}</span>
                      {p.errors.length > 0 && <span className="text-[10px] text-danger">⚠</span>}
                      <span className="font-mono text-[9px] text-muted-foreground">{p.network.ip.split('.')[3]}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )
        })}
      </nav>

      <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
        <Button onClick={handleSave} variant={saveState === 'failed' ? 'danger' : 'secondary'}>
          {saveState === 'saved' ? <Check size={11} /> : <Save size={11} />}
          {saveState === 'saved' ? 'SAVED' : saveState === 'failed' ? 'SAVE FAILED' : 'SAVE PROJECT'}
        </Button>
      </div>
    </aside>
  )
}

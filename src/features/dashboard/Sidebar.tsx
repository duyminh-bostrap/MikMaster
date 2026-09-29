import { ChevronRight, FileDown, LayoutGrid, Pencil, Plus, Save, Check } from 'lucide-react'
import { useState } from 'react'
import { AppLogoMenu } from '@/features/appmenu/AppLogoMenu'
import { PowerDot, StatusDot } from '@/components/ui/StatusDot'
import { Button } from '@/components/ui/Button'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { useProjectActions } from '@/store/hooks'
import { ALL_BOOTHS } from '@/hooks/useBoothFilter'
import { cn } from '@/utils/cn'
import type { Booth, Project, Projector } from '@/types'
import type { EditTarget } from './EditDialogs'
import { BoothDropZone, projectorDragProps } from './moveProjector'
import { QuickControls } from './QuickControls'

interface SidebarProps {
  project: Project
  booths: Booth[]
  projectors: Projector[]
  activeBooth: string
  onSelectBooth: (boothId: string) => void
  onOpenProjector: (id: string) => void
  onSave: () => Promise<boolean>
  onSaveFile: () => Promise<boolean>
  onEdit: (target: EditTarget) => void
  onMoveProjector: (projectorId: string, boothId: string) => void
  onProjectorContextMenu: (e: React.MouseEvent, projectorId: string) => void
}

const EDIT_BUTTON = 'flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100'

export function Sidebar({ project, booths, projectors, activeBooth, onSelectBooth, onOpenProjector, onSave, onSaveFile, onEdit, onMoveProjector, onProjectorContextMenu }: SidebarProps) {
  // Booth mới thêm (không có trong lần render đầu) vẫn mở sẵn: lưu những booth đã thu gọn thay vì đã mở.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const expanded = { has: (id: string) => !collapsed.has(id) }
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>('idle')
  const [fileState, setFileState] = useState<'idle' | 'saved' | 'failed'>('idle')
  const { updateProject, updateBooth } = useProjectActions()

  async function handleSaveFile() {
    try {
      if (!(await onSaveFile())) return
      setFileState('saved')
    } catch {
      setFileState('failed')
    }
    setTimeout(() => setFileState('idle'), 1800)
  }

  function toggle(id: string) {
    setCollapsed(prev => {
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
        <AppLogoMenu />
      </div>

      <div className="border-b border-border px-4 py-3">
        <p className="mb-1 font-mono text-xs tracking-[0.08em] text-muted-foreground">PROJECT</p>
        <InlineEdit label="Project name" value={project.name} onSave={name => updateProject({ name })}
          className="mb-0.5 block text-sm font-semibold leading-tight text-foreground" />
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
            <BoothDropZone key={booth.id} onDrop={id => onMoveProjector(id, booth.id)}>
              {over => (<>
              <div
                className={cn('group flex cursor-pointer items-center border-l-2 px-3 py-2 transition-colors',
                  over ? 'border-accent bg-accent/15 ring-1 ring-accent/50 ring-inset' : isActive ? 'border-primary bg-primary/[0.06]' : 'border-transparent hover:bg-muted')}
                onClick={() => { onSelectBooth(booth.id); toggle(booth.id) }}
                onContextMenu={e => { e.preventDefault(); onEdit({ kind: 'booth', id: booth.id }) }}
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
                    <InlineEdit label="Booth name" value={booth.name} onSave={name => updateBooth(booth.id, { name })}
                      className={cn('truncate text-xs font-semibold', isActive ? 'text-primary' : 'text-foreground')} />
                    {hasAlert && <StatusDot tone="danger" className="size-1.5" />}
                  </div>
                  <span className="text-xs text-muted-foreground">{booth.location}</span>
                </div>
                <button type="button" aria-label={`Edit ${booth.name}`} title="Edit booth" className={cn(EDIT_BUTTON, 'mr-1')}
                  onClick={e => { e.stopPropagation(); onEdit({ kind: 'booth', id: booth.id }) }}><Pencil size={10} /></button>
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
                      onContextMenu={e => onProjectorContextMenu(e, p.id)}
                      {...projectorDragProps(p.id)}
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
              </>)}
            </BoothDropZone>
          )
        })}

        <button type="button" onClick={() => onEdit({ kind: 'booth', id: null })}
          className="mx-4 mt-2 flex w-[calc(100%-2rem)] items-center justify-center gap-1.5 rounded-sm border border-dashed border-border py-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
          <Plus size={10} />ADD BOOTH
        </button>
      </nav>

      <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
        <Button onClick={handleSave} variant={saveState === 'failed' ? 'danger' : 'secondary'}>
          {saveState === 'saved' ? <Check size={11} /> : <Save size={11} />}
          {saveState === 'saved' ? 'SAVED' : saveState === 'failed' ? 'SAVE FAILED' : 'SAVE PROJECT'}
        </Button>
        <Button onClick={() => void handleSaveFile()} variant={fileState === 'failed' ? 'danger' : 'secondary'} title="Save the project as a file on this computer (device passwords are not included)">
          {fileState === 'saved' ? <Check size={11} /> : <FileDown size={11} />}
          {fileState === 'saved' ? 'FILE SAVED' : fileState === 'failed' ? 'SAVE FAILED' : 'SAVE TO FILE…'}
        </Button>
      </div>
    </aside>
  )
}

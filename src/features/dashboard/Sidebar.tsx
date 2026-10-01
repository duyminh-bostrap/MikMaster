import { ChevronRight, LayoutGrid, PanelLeftClose, PanelLeftOpen, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AppLogoMenu } from '@/features/appmenu/AppLogoMenu'
import { PowerDot, StatusDot } from '@/components/ui/StatusDot'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { usePref } from '@/services/prefs'
import { useIsDirty, useProjectActions } from '@/store/hooks'
import { ALL_BOOTHS } from '@/hooks/useBoothFilter'
import { cn } from '@/utils/cn'
import type { Booth, Project, Projector } from '@/types'
import type { EditTarget } from './EditDialogs'
import { BoothDropZone, projectorDragProps } from './moveProjector'
import { t } from '@/i18n'

interface SidebarProps {
  project: Project
  booths: Booth[]
  projectors: Projector[]
  activeBooth: string
  onSelectBooth: (boothId: string) => void
  onOpenProjector: (id: string) => void
  onSave: () => Promise<boolean>
  onEdit: (target: EditTarget) => void
  onAddProjector: () => void
  onMoveProjector: (projectorId: string, boothId: string) => void
  onProjectorContextMenu: (e: React.MouseEvent, projectorId: string) => void
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

const DELETE_BUTTON = 'flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100'

export function Sidebar({ project, booths, projectors, activeBooth, onSelectBooth, onOpenProjector, onSave, onEdit, onAddProjector, onMoveProjector, onProjectorContextMenu }: SidebarProps) {
  // Booth mới thêm (không có trong lần render đầu) vẫn mở sẵn: lưu những booth đã thu gọn thay vì đã mở.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const expanded = { has: (id: string) => !collapsed.has(id) }
  const { updateProject, updateBooth, addBooth } = useProjectActions()
  const dirty = useIsDirty()
  // Booth vừa thêm mở sẵn ô đổi tên.
  const [renaming, setRenaming] = useState<string | null>(null)

  function newBooth() {
    const taken = new Set(booths.map(b => b.name))
    let n = booths.length + 1
    while (taken.has(`Group ${n}`)) n++
    setRenaming(addBooth(`Group ${n}`).id)
  }

  function toggle(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }


  const allActive = activeBooth === ALL_BOOTHS
  const [slim, setSlim] = usePref('sidebarCollapsed')

  // Thu gọn: một dải hẹp chỉ có nút mở lại, "All" và mỗi group một ô (chữ cái đầu + số máy); trỏ chuột để xem tên, kéo máy thả vào group vẫn được.
  if (slim) {
    const initials = (name: string) => name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
    return (
      <aside aria-label={t('Groups')} data-testid="sidebar-slim" className="flex h-full w-16 shrink-0 flex-col items-center border-r border-border bg-card py-2">
        <button type="button" onClick={() => setSlim(false)} aria-label={t('Expand the menu')} title={t('Expand the menu')}
          className="relative mb-2 flex size-10 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <PanelLeftOpen size={16} />
          {dirty && <span className="absolute top-1 right-1 size-2 rounded-full bg-warn" title={t('UNSAVED')} />}
        </button>
        <div className="flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto px-1.5">
          <button type="button" onClick={() => onSelectBooth(ALL_BOOTHS)} title={`${t('All Projectors')} · ${projectors.length}`} aria-label={t('All Projectors')}
            className={cn('flex w-full flex-col items-center rounded-sm border py-1.5 transition-colors', allActive ? 'border-primary bg-primary/[0.08] text-primary' : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground')}>
            <LayoutGrid size={14} />
            <span className="mt-0.5 font-mono text-[10px]">{projectors.length}</span>
          </button>
          <div className="my-0.5 h-px w-8 bg-border" />
          {booths.map(booth => {
            const inBooth = projectors.filter(p => p.boothId === booth.id)
            const on = inBooth.filter(p => p.power === 'on').length
            const isActive = activeBooth === booth.id
            return (
              <BoothDropZone key={booth.id} className="w-full" onDrop={id => onMoveProjector(id, booth.id)}>
                {over => (
                  <button type="button" onClick={() => onSelectBooth(booth.id)} title={`${booth.name} · ${inBooth.length} · ${on}↑`} aria-label={booth.name}
                    className={cn('relative flex w-full flex-col items-center rounded-sm border py-1.5 transition-colors',
                      over ? 'border-accent bg-accent/15' : isActive ? 'border-primary bg-primary/[0.08] text-primary' : 'border-transparent text-foreground hover:bg-muted')}>
                    <span className="font-mono text-xs font-bold">{initials(booth.name)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{inBooth.length}</span>
                    {on > 0 && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-ok" />}
                    {inBooth.some(p => p.errors.length > 0) && <span className="absolute top-1 left-1 size-1.5 rounded-full bg-danger" />}
                  </button>
                )}
              </BoothDropZone>
            )
          })}
        </div>
        <button type="button" onClick={onAddProjector} aria-label={t('ADD PROJECTOR')} title={t('ADD PROJECTOR')}
          className="mt-2 flex size-9 items-center justify-center rounded-sm border border-accent/30 bg-accent/10 text-accent transition-colors hover:bg-accent/20"><Plus size={14} /></button>
      </aside>
    )
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <AppLogoMenu />
        <button type="button" onClick={() => setSlim(true)} aria-label={t('Collapse the menu')} title={t('Collapse the menu')}
          className="flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><PanelLeftClose size={15} /></button>
      </div>

      <div className="border-b border-border px-4 py-3">
        <p className="mb-1 flex items-center justify-between font-mono text-xs tracking-[0.08em] text-muted-foreground">
          PROJECT
          {dirty && (
            <button type="button" onClick={() => void onSave()} title={`Unsaved changes — click to save (${IS_MAC ? '⌘S' : 'Ctrl+S'})`}
              className="flex items-center gap-1 rounded-sm px-1 text-[10px] text-warn transition-colors hover:bg-warn/10">
              <span className="size-1.5 rounded-full bg-warn" />{t('UNSAVED')}
            </button>
          )}
        </p>
        <InlineEdit label={t('Project name')} value={project.name} onSave={name => updateProject({ name })}
          className="mb-0.5 block text-sm font-semibold leading-tight text-foreground" />
      </div>

      <nav aria-label={t('Groups')} className="flex-1 overflow-y-auto py-2">
        <button
          type="button"
          onClick={() => onSelectBooth(ALL_BOOTHS)}
          className={cn('flex w-full items-center justify-between border-l-2 px-4 py-2 text-left transition-colors', allActive ? 'border-primary bg-primary/[0.08]' : 'border-transparent hover:bg-muted')}
        >
          <span className="flex items-center gap-2">
            <LayoutGrid size={12} className={allActive ? 'text-primary' : 'text-muted-foreground'} />
            <span className={cn('text-xs font-medium', allActive ? 'text-primary' : 'text-foreground')}>{t('All Projectors')}</span>
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
                    <InlineEdit label={t('Group name')} value={booth.name} onSave={name => updateBooth(booth.id, { name })}
                      editRequest={renaming === booth.id ? 1 : 0}
                      className={cn('truncate text-xs font-semibold', isActive ? 'text-primary' : 'text-foreground')} />
                    {hasAlert && <StatusDot tone="danger" className="size-1.5" />}
                  </div>
                </div>
                {booths.length > 1 && (
                  <button type="button" aria-label={`Delete ${booth.name}`} title={t('Delete group')} className={cn(DELETE_BUTTON, 'mr-1')}
                    onClick={e => { e.stopPropagation(); onEdit({ kind: 'deleteBooth', id: booth.id }) }}><Trash2 size={10} /></button>
                )}
                <div className="flex flex-col items-end gap-0.5 font-mono">
                  <span className="text-xs text-muted-foreground">{inBooth.length}</span>
                  <span className="text-[9px] text-ok">{online}↑</span>
                </div>
              </div>

              {isOpen && (
                <>
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

      </nav>

      {/* Thêm booth / máy chiếu: cố định ở cuối sidebar. */}
      <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
        <button type="button" onClick={newBooth}
          className="flex items-center justify-center gap-1.5 rounded-sm border border-dashed border-border py-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
          <Plus size={10} />{t('ADD GROUP')}
        </button>
        <button type="button" onClick={onAddProjector}
          className="flex items-center justify-center gap-1.5 rounded-sm border border-accent/30 bg-accent/10 py-1.5 font-mono text-[10px] text-accent transition-colors hover:bg-accent/20">
          <Plus size={10} />{t('ADD PROJECTOR')}
        </button>
      </div>

    </aside>
  )
}

import { ProjectorCard } from '@/components/projector/ProjectorCard'
import { useProjectActions } from '@/store/hooks'
import type { Projector } from '@/types'
import { projectorDragProps } from './moveProjector'

export function ProjectorGrid({ projectors, onOpen, onContextMenu }: {
  projectors: Projector[]
  onOpen: (id: string) => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
}) {
  const { setPower, setShutter } = useProjectActions()

  if (projectors.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="font-mono text-sm text-muted-foreground">No projectors in this booth</span>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
      {projectors.map(p => (
        <ProjectorCard
          key={p.id}
          projector={p}
          onOpen={() => onOpen(p.id)}
          onTogglePower={() => setPower([p.id], p.power === 'on' ? 'standby' : 'on')}
          onToggleShutter={() => setShutter([p.id], !p.shutter)}
          onContextMenu={e => onContextMenu(e, p.id)}
          dragProps={projectorDragProps(p.id)}
        />
      ))}
    </div>
  )
}

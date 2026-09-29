import { ProjectorCard } from '@/components/projector/ProjectorCard'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useT } from '@/i18n'
import { useProjectActions } from '@/store/hooks'
import type { Projector } from '@/types'
import { projectorDragProps } from './moveProjector'

export function ProjectorGrid({ projectors, emptyText, onOpen, onContextMenu }: {
  projectors: Projector[]
  emptyText: string
  onOpen: (id: string) => void
  onContextMenu: (e: React.MouseEvent, id: string) => void
}) {
  const t = useT()
  const { setPower, setShutter } = useProjectActions()
  const [confirmDialog, confirm] = useConfirm()

  // Tắt máy trên thẻ hỏi xác nhận (dễ bấm nhầm khi rê chuột qua lưới); bật thì không.
  async function powerOff(p: Projector) {
    if (p.power !== 'on') return
    const ok = await confirm({ title: t('TURN OFF PROJECTOR'), message: t('Turn off {name}? Its image goes dark.', { name: p.name }), confirmLabel: t('TURN OFF') })
    if (ok) setPower([p.id], 'standby')
  }

  if (projectors.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="font-mono text-sm text-muted-foreground">{emptyText}</span>
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
          onPowerOn={() => { if (p.power !== 'on') setPower([p.id], 'on') }}
          onPowerOff={() => void powerOff(p)}
          onToggleShutter={() => setShutter([p.id], !p.shutter)}
          onContextMenu={e => onContextMenu(e, p.id)}
          dragProps={projectorDragProps(p.id)}
        />
      ))}
      {confirmDialog}
    </div>
  )
}

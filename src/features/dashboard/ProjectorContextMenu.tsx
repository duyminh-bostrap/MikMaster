import { Check, ExternalLink, MoveRight, Pencil } from 'lucide-react'
import { MenuHeading, MenuItem, MenuSeparator, PopupMenu, type MenuPoint } from '@/components/ui/PopupMenu'
import { PingCheck } from '@/features/ping/PingCheck'
import type { Booth, Projector } from '@/types'

export interface MenuAnchor extends MenuPoint { projectorId: string }

/** Menu chuột phải cho máy chiếu: mở trang điều khiển, sửa thông tin, ping, chuyển sang booth khác. */
export function ProjectorContextMenu({ anchor, projector, booths, onMove, onOpen, onEdit, onClose }: {
  anchor: MenuAnchor
  projector: Projector
  booths: Booth[]
  onMove: (boothId: string) => void
  onOpen: () => void
  onEdit: () => void
  onClose: () => void
}) {
  return (
    <PopupMenu at={anchor} label={`Actions for ${projector.name}`} onClose={onClose}>
      <MenuHeading>{projector.id} · {projector.name}</MenuHeading>
      <MenuItem icon={<ExternalLink size={11} />} label="Open control" onSelect={() => { onOpen(); onClose() }} />
      <MenuItem icon={<Pencil size={11} />} label="Edit info…" onSelect={() => { onEdit(); onClose() }} />
      <MenuSeparator />
      <div className="px-3 py-1"><PingCheck projector={projector} compact /></div>
      <MenuSeparator />
      <MenuHeading><MoveRight size={10} />MOVE TO BOOTH</MenuHeading>
      {booths.map(b => {
        const current = b.id === projector.boothId
        return (
          <MenuItem key={b.id} disabled={current} icon={current && <Check size={11} className="text-primary" />} label={b.name}
            onSelect={() => { onMove(b.id); onClose() }} />
        )
      })}
    </PopupMenu>
  )
}

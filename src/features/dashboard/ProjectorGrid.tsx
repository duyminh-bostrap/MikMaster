import { ProjectorCard } from '@/components/projector/ProjectorCard'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useT } from '@/i18n'
import { useProjectActions } from '@/store/hooks'
import type { Booth, Projector } from '@/types'
import { projectorDragProps } from './moveProjector'

export function ProjectorGrid({ projectors, groups, emptyText, onOpen, onContextMenu }: {
  projectors: Projector[]
  /** Có truyền (tab All) → gộp thẻ theo group, mỗi group một đầu mục; bỏ group không còn máy nào (sau khi lọc). */
  groups?: Booth[]
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

  const card = (p: Projector) => (
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
  )
  const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4'

  if (!groups) return <div className={GRID}>{projectors.map(card)}{confirmDialog}</div>

  // Gộp theo group (theo thứ tự group); máy có group không còn tồn tại xếp vào cuối, không đầu mục.
  const known = new Set(groups.map(g => g.id))
  const sections = groups
    .map(g => ({ id: g.id, name: g.name, items: projectors.filter(p => p.boothId === g.id) }))
    .filter(s => s.items.length > 0)
  const orphans = projectors.filter(p => !known.has(p.boothId))
  return (
    <div className="flex flex-col gap-6">
      {sections.map(s => (
        <section key={s.id} aria-label={s.name} data-testid={`group-${s.id}`}>
          <h3 className="mb-3 flex items-baseline gap-3 border-b border-border pb-1.5 font-mono text-xs tracking-[0.08em] text-foreground">
            <span className="font-semibold uppercase">{s.name}</span>
            <span className="text-muted-foreground">{t('{n} device(s)', { n: s.items.length })} · {t('{n} on', { n: s.items.filter(p => p.power === 'on').length })}</span>
          </h3>
          <div className={GRID}>{s.items.map(card)}</div>
        </section>
      ))}
      {orphans.length > 0 && <div className={GRID}>{orphans.map(card)}</div>}
      {confirmDialog}
    </div>
  )
}

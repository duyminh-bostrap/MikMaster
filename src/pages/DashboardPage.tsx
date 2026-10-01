import { useCallback, useMemo, useState } from 'react'
import { usePref } from '@/services/prefs'
import { useNavigate } from 'react-router'
import { AppFooter } from '@/components/layout/AppFooter'
import { GatewayBadge } from '@/components/layout/GatewayBadge'
import { LicenseBadge } from '@/components/layout/LicenseBadge'
import { AppShell } from '@/components/layout/AppShell'
import { BoothTabs } from '@/features/dashboard/BoothTabs'
import { PowerSummary } from '@/features/dashboard/PowerSummary'
import { FleetMetrics } from '@/features/dashboard/FleetMetrics'
import { ProjectorGrid } from '@/features/dashboard/ProjectorGrid'
import { MonitorView } from '@/features/dashboard/MonitorView'
import { setAllView, useDashboardView } from '@/services/dashboardView'
import { QuickControls } from '@/features/dashboard/QuickControls'
import { Sidebar } from '@/features/dashboard/Sidebar'
import { TopBar } from '@/features/dashboard/TopBar'
import { ALL_BOOTHS, useBoothFilter } from '@/hooks/useBoothFilter'
import { ProjectorFilterBar } from '@/features/dashboard/ProjectorFilterBar'
import { useT } from '@/i18n'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { STATUS_FILTERS, matchesQuery, matchesStatus, type StatusFilter } from '@/utils/projectorFilter'
import { computeFleetStats, connectionStats } from '@/utils/fleet'
import { formatLongDate } from '@/utils/format'
import { useProjectCommands } from '@/features/appmenu/useProjectCommands'
import { EditDialog, type EditTarget } from '@/features/dashboard/EditDialogs'
import { useOpenProject, useProjectActions } from '@/store/hooks'
import { ProjectorContextMenu, type MenuAnchor } from '@/features/dashboard/ProjectorContextMenu'

export default function DashboardPage() {
  const { project, booths, projectors } = useOpenProject()
  const [activeBooth, setActiveBooth] = useBoothFilter(booths, project.id)
  const navigate = useNavigate()
  const cmd = useProjectCommands()

  const t = useT()
  const scope = useMemo(
    () => (activeBooth === ALL_BOOTHS ? projectors : projectors.filter(p => p.boothId === activeBooth)),
    [activeBooth, projectors],
  )
  const { view } = useDashboardView()
  const [query, setQuery] = useState('')
  const [status, setStatus] = usePref('statusFilter')
  const boothName = useCallback((id: string) => booths.find(b => b.id === id)?.name ?? '', [booths])
  const matching = useMemo(() => scope.filter(p => matchesQuery(p, query, boothName(p.boothId))), [scope, query, boothName])
  const visible = useMemo(() => matching.filter(p => matchesStatus(p, status)), [matching, status])
  const counts = useMemo(() => Object.fromEntries(STATUS_FILTERS.map(s => [s, matching.filter(p => matchesStatus(p, s)).length])) as Record<StatusFilter, number>, [matching])
  const stats = useMemo(() => computeFleetStats(projectors), [projectors])
  const inBooth = activeBooth !== ALL_BOOTHS
  const scopeLabel = inBooth ? boothName(activeBooth) : t('All Projectors')
  const scopeIds = scope.map(p => p.id)
  const emptyText = scope.length === 0 ? (inBooth ? t('No projectors in this group') : t('No projectors yet')) : t('No projector matches the filter')
  const openProjector = (id: string) => navigate(`/project/projectors/${id}`)
  const { moveToBooth, removeProjector } = useProjectActions()
  const [confirmDialog, confirm] = useConfirm()
  async function removeWithConfirm(id: string, name: string) {
    const ok = await confirm({ title: t('REMOVE PROJECTOR'), message: t('Remove {name} from this project? The projector itself is not changed.', { name }), confirmLabel: t('REMOVE') })
    if (ok) removeProjector(id)
  }
  const [menu, setMenu] = useState<MenuAnchor | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  const menuProjector = menu ? projectors.find(p => p.id === menu.projectorId) : undefined

  function moveProjector(projectorId: string, boothId: string) {
    const booth = booths.find(b => b.id === boothId)
    if (booth) moveToBooth([projectorId], booth)
  }
  const [editing, setEditing] = useState<EditTarget | null>(null)
  const closeEdit = useCallback(() => setEditing(null), [])

  function openMenu(e: React.MouseEvent, projectorId: string) {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, projectorId })
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          project={project} booths={booths} projectors={projectors}
          activeBooth={activeBooth} onSelectBooth={setActiveBooth} onOpenProjector={openProjector}
          onSave={cmd.save}
          onEdit={setEditing}
          onAddProjector={() => setEditing({ kind: 'addProjector', boothId: inBooth ? activeBooth : undefined })}
          onMoveProjector={moveProjector} onProjectorContextMenu={openMenu}
        />
      }
    >
      <TopBar scopeLabel={scopeLabel} unitCount={scope.length} stats={stats} connection={connectionStats(scope)} />
      {/* Hàng điều khiển: hai ô bật / tắt tất cả bên trái, cụm shutter / OSD / test pattern bên phải. */}
      <PowerSummary projectors={scope} scopeLabel={scopeLabel}>
        <QuickControls projectorIds={scopeIds} scopeLabel={scopeLabel} />
      </PowerSummary>
      <FleetMetrics stats={stats} projectors={projectors} />
      <BoothTabs booths={booths} projectors={projectors} active={activeBooth} onSelect={setActiveBooth} onMoveProjector={moveProjector} />
      <ProjectorFilterBar query={query} onQuery={setQuery} status={status} onStatus={setStatus} counts={counts}
        {...(inBooth ? {} : { view, onView: setAllView })} />
      <main className="flex-1 overflow-y-auto p-5">
        {!inBooth && view === 'monitor'
          ? <MonitorView projectors={visible} booths={booths} onOpen={openProjector} emptyText={emptyText} />
          : <ProjectorGrid projectors={visible} groups={inBooth ? undefined : booths} onOpen={openProjector} onContextMenu={openMenu} emptyText={emptyText} />}
      </main>
      {menu && menuProjector && (
        <ProjectorContextMenu anchor={menu} projector={menuProjector} booths={booths}
          onMove={boothId => moveProjector(menuProjector.id, boothId)} onOpen={() => openProjector(menuProjector.id)}
          onEdit={() => setEditing({ kind: 'projector', id: menuProjector.id })}
          onRemove={() => void removeWithConfirm(menuProjector.id, menuProjector.name)} onClose={closeMenu} />
      )}
      {editing && <EditDialog target={editing} onClose={closeEdit} />}
      {confirmDialog}
      <AppFooter left={`MikMaster v${__APP_VERSION__}`} right={<><LicenseBadge /><GatewayBadge />{formatLongDate(new Date())}</>} />
    </AppShell>
  )
}

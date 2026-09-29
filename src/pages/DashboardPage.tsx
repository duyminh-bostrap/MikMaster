import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { AppFooter } from '@/components/layout/AppFooter'
import { GatewayBadge } from '@/components/layout/GatewayBadge'
import { AppShell } from '@/components/layout/AppShell'
import { BoothTabs } from '@/features/dashboard/BoothTabs'
import { FleetMetrics } from '@/features/dashboard/FleetMetrics'
import { ProjectorGrid } from '@/features/dashboard/ProjectorGrid'
import { QuickControls } from '@/features/dashboard/QuickControls'
import { Sidebar } from '@/features/dashboard/Sidebar'
import { TopBar } from '@/features/dashboard/TopBar'
import { ALL_BOOTHS, useBoothFilter } from '@/hooks/useBoothFilter'
import { computeFleetStats } from '@/utils/fleet'
import { formatLongDate } from '@/utils/format'
import { saveProject } from '@/services/projectRepository'
import { useOpenProject, useProjectActions } from '@/store/hooks'
import { ProjectorContextMenu, type MenuAnchor } from '@/features/dashboard/ProjectorContextMenu'
import { useGateway } from '@/store/useGateway'

export default function DashboardPage() {
  const { project, booths, projectors } = useOpenProject()
  const [activeBooth, setActiveBooth] = useBoothFilter(booths)
  const navigate = useNavigate()
  const { gateway } = useGateway()

  const scope = useMemo(
    () => (activeBooth === ALL_BOOTHS ? projectors : projectors.filter(p => p.boothId === activeBooth)),
    [activeBooth, projectors],
  )
  const stats = useMemo(() => computeFleetStats(projectors), [projectors])
  const scopeLabel = activeBooth === ALL_BOOTHS ? 'All Projectors' : (booths.find(b => b.id === activeBooth)?.name ?? '')
  const openProjector = (id: string) => navigate(`/project/projectors/${id}`)
  const { moveToBooth } = useProjectActions()
  const [menu, setMenu] = useState<MenuAnchor | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  const menuProjector = menu ? projectors.find(p => p.id === menu.projectorId) : undefined

  function moveProjector(projectorId: string, boothId: string) {
    const booth = booths.find(b => b.id === boothId)
    if (booth) moveToBooth([projectorId], booth)
  }
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
          onSave={() => saveProject({ project, booths, projectors }, gateway)}
          onMoveProjector={moveProjector} onProjectorContextMenu={openMenu}
        />
      }
    >
      <TopBar scopeLabel={scopeLabel} unitCount={scope.length} stats={stats} />
      <FleetMetrics stats={stats} projectors={projectors} actions={<QuickControls projectorIds={scope.map(p => p.id)} />} />
      <BoothTabs booths={booths} projectors={projectors} active={activeBooth} onSelect={setActiveBooth} onMoveProjector={moveProjector} />
      <main className="flex-1 overflow-y-auto p-5">
        <ProjectorGrid projectors={scope} onOpen={openProjector} onContextMenu={openMenu} />
      </main>
      {menu && menuProjector && (
        <ProjectorContextMenu anchor={menu} projector={menuProjector} booths={booths}
          onMove={boothId => moveProjector(menuProjector.id, boothId)} onOpen={() => openProjector(menuProjector.id)} onClose={closeMenu} />
      )}
      <AppFooter left="MikMaster v0.1.0" right={<><GatewayBadge />{formatLongDate(new Date())}</>} />
    </AppShell>
  )
}

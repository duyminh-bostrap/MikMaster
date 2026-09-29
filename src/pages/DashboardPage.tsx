import { useMemo } from 'react'
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
import { useOpenProject } from '@/store/hooks'
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

  return (
    <AppShell
      sidebar={
        <Sidebar
          project={project} booths={booths} projectors={projectors}
          activeBooth={activeBooth} onSelectBooth={setActiveBooth} onOpenProjector={openProjector}
          onSave={() => saveProject({ project, booths, projectors }, gateway)}
        />
      }
    >
      <TopBar scopeLabel={scopeLabel} unitCount={scope.length} stats={stats} />
      <FleetMetrics stats={stats} projectors={projectors} actions={<QuickControls projectorIds={scope.map(p => p.id)} />} />
      <BoothTabs booths={booths} projectors={projectors} active={activeBooth} onSelect={setActiveBooth} />
      <main className="flex-1 overflow-y-auto p-5">
        <ProjectorGrid projectors={scope} onOpen={openProjector} />
      </main>
      <AppFooter left="MikMaster v0.1.0" right={<><GatewayBadge />{formatLongDate(new Date())}</>} />
    </AppShell>
  )
}

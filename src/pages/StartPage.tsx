import { useState } from 'react'
import { useNavigate } from 'react-router'
import { AppFooter } from '@/components/layout/AppFooter'
import { AppLogo } from '@/components/layout/AppLogo'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'
import { ChooseMode } from '@/features/start/ChooseMode'
import { LoadProjectList } from '@/features/start/LoadProjectList'
import { NewProjectWizard } from '@/features/start/NewProjectWizard'
import { useClock } from '@/hooks/useClock'
import { formatClock } from '@/utils/format'
import { listSavedProjects, loadProject, type ProjectSnapshot } from '@/services/projectRepository'
import { useProjectActions } from '@/store/hooks'

type Mode = 'choose' | 'new' | 'load'

export default function StartPage() {
  const [mode, setMode] = useState<Mode>('choose')
  const [saved] = useState(listSavedProjects)
  const { launchProject } = useProjectActions()
  const navigate = useNavigate()
  const now = useClock()

  function launch(snapshot: ProjectSnapshot) {
    launchProject(snapshot)
    navigate('/project')
  }

  function loadSaved(id: string) {
    const snapshot = loadProject(id)
    if (snapshot) launch(snapshot)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-background px-6 py-3">
        <div className="flex items-center gap-3">
          <AppLogo size="lg" />
          <Badge>v0.1.0</Badge>
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatClock(now)}</span>
      </header>

      <main className="flex flex-1 items-center justify-center p-8">
        {mode === 'choose' && <ChooseMode savedCount={saved.length} onNew={() => setMode('new')} onLoad={() => setMode('load')} />}
        {mode === 'load' && <LoadProjectList projects={saved} onLoad={loadSaved} onBack={() => setMode('choose')} />}
        {mode === 'new' && <NewProjectWizard onBack={() => setMode('choose')} onLaunch={launch} />}
      </main>

      <AppFooter left="MikMaster — Professional AV Control" right={<><StatusDot tone="ok" className="size-1.5" />Network ready</>} />
    </div>
  )
}

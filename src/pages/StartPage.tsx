import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { AppFooter } from '@/components/layout/AppFooter'
import { AppLogo } from '@/components/layout/AppLogo'
import { GatewayBadge } from '@/components/layout/GatewayBadge'
import { Badge } from '@/components/ui/Badge'
import { StatusDot } from '@/components/ui/StatusDot'
import { ChooseMode } from '@/features/start/ChooseMode'
import { LoadProjectList } from '@/features/start/LoadProjectList'
import { NewProjectWizard } from '@/features/start/NewProjectWizard'
import { OpenFileStep } from '@/features/start/OpenFileStep'
import { useClock } from '@/hooks/useClock'
import { formatClock } from '@/utils/format'
import { applyLoginToMissing, countMissingLogins, fillMissingCredentials, type Credentials } from '@/utils/credentials'
import { getDeviceCredentials, getSharedCredentials, saveSharedCredentials } from '@/services/credentialCache'
import { openProjectFile, ProjectFileError } from '@/services/projectFile'
import { listSavedProjects, loadProject, type ProjectSnapshot } from '@/services/projectRepository'
import { useProjectActions } from '@/store/hooks'
import { useGateway } from '@/store/useGateway'
import type { SavedProjectSummary } from '@/types'

type Mode = 'choose' | 'new' | 'load' | 'file'

export default function StartPage() {
  const [mode, setMode] = useState<Mode>('choose')
  const { gateway, mode: gatewayMode } = useGateway()
  const [saved, setSaved] = useState<SavedProjectSummary[]>([])
  // Đợi phát hiện gateway xong mới đọc danh sách, để thấy cả project lưu trên server.
  useEffect(() => {
    if (gatewayMode === 'checking') return
    let cancelled = false
    void listSavedProjects(gateway).then(list => { if (!cancelled) setSaved(list) })
    return () => { cancelled = true }
  }, [gateway, gatewayMode])
  const { launchProject } = useProjectActions()
  const navigate = useNavigate()
  const now = useClock()
  const [opened, setOpened] = useState<ProjectSnapshot | null>(null)
  const [fileError, setFileError] = useState('')

  function launch(snapshot: ProjectSnapshot) {
    launchProject(snapshot)
    navigate('/project')
  }

  async function loadSaved(id: string) {
    const snapshot = await loadProject(id, gateway)
    if (snapshot) launch(snapshot)
  }

  async function openFile() {
    setFileError('')
    try {
      const snapshot = await openProjectFile()
      if (!snapshot) return
      // Máy đã có mật khẩu trong phiên này thì khỏi hỏi lại; còn thiếu thì qua bước đăng nhập.
      const filled = { ...snapshot, projectors: fillMissingCredentials(snapshot.projectors, { device: getDeviceCredentials, shared: getSharedCredentials }) }
      if (countMissingLogins(filled.projectors) === 0) return launch(filled)
      setOpened(filled)
      setMode('file')
    } catch (e) {
      setFileError(e instanceof ProjectFileError ? e.message : 'Could not read the file.')
    }
  }

  function launchOpened(login?: Credentials) {
    if (!opened) return
    if (login) saveSharedCredentials(login)
    launch({ ...opened, projectors: login ? applyLoginToMissing(opened.projectors, login) : opened.projectors })
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

      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        {fileError && <p role="alert" className="w-full max-w-2xl rounded-sm border border-danger/40 bg-danger/10 px-4 py-2 font-mono text-xs text-danger">{fileError}</p>}
        {mode === 'choose' && <ChooseMode savedCount={saved.length} onNew={() => setMode('new')} onLoad={() => setMode('load')} onOpenFile={() => void openFile()} />}
        {mode === 'load' && <LoadProjectList projects={saved} onLoad={loadSaved} onOpenFile={() => void openFile()} onBack={() => setMode('choose')} />}
        {mode === 'file' && opened && <OpenFileStep snapshot={opened} onLaunch={launchOpened} onBack={() => setMode('choose')} />}
        {mode === 'new' && <NewProjectWizard onBack={() => setMode('choose')} onLaunch={launch} />}
      </main>

      <AppFooter left="MikMaster — Professional AV Control" right={<><GatewayBadge /><StatusDot tone="ok" className="size-1.5" />Network ready</>} />
    </div>
  )
}

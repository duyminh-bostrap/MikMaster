import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { AppFooter } from '@/components/layout/AppFooter'
import { GatewayBadge } from '@/components/layout/GatewayBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { GatewayTokenDialog } from '@/features/gateway/GatewayTokenDialog'
import { StatusDot } from '@/components/ui/StatusDot'
import { AppLogoMenu } from '@/features/appmenu/AppLogoMenu'
import { useProjectCommands, type StartIntent } from '@/features/appmenu/useProjectCommands'
import { ChooseMode } from '@/features/start/ChooseMode'
import { LoadProjectList } from '@/features/start/LoadProjectList'
import { NewProjectWizard } from '@/features/start/NewProjectWizard'
import { OpenFileStep } from '@/features/start/OpenFileStep'
import { useClock } from '@/hooks/useClock'
import { formatClock } from '@/utils/format'
import { applyLoginToMissing, type Credentials } from '@/utils/credentials'
import { saveSharedCredentials } from '@/services/credentialCache'
import { ProjectFileError } from '@/services/projectFile'
import type { ProjectSnapshot } from '@/services/projectRepository'
import { useGateway } from '@/store/useGateway'
import type { SavedProjectSummary } from '@/types'

type Mode = 'choose' | 'new' | 'load' | 'file'

export default function StartPage() {
  const [mode, setMode] = useState<Mode>('choose')
  const { mode: gatewayMode } = useGateway()
  const [tokenOpen, setTokenOpen] = useState(false)
  const cmd = useProjectCommands()
  const { listRecent } = cmd
  const [saved, setSaved] = useState<SavedProjectSummary[]>([])
  // Đợi phát hiện gateway xong mới đọc danh sách, để thấy cả project lưu trên server.
  useEffect(() => {
    if (gatewayMode === 'checking') return
    let cancelled = false
    void listRecent().then(list => { if (!cancelled) setSaved(list) })
    return () => { cancelled = true }
  }, [listRecent, gatewayMode])
  const now = useClock()
  const [opened, setOpened] = useState<ProjectSnapshot | null>(null)
  const [fileError, setFileError] = useState('')

  // Lệnh từ menu logo (New / Open file cần đăng nhập) đến qua state của điều hướng.
  const location = useLocation()
  useEffect(() => {
    const intent = location.state as StartIntent | null
    if (!intent) return
    setFileError('')
    if ('opened' in intent) { setOpened(intent.opened); setMode('file') }
    else if (intent.mode === 'new') setMode('new')
  }, [location.key, location.state])

  async function openFile() {
    setFileError('')
    try {
      await cmd.openFile()
    } catch (e) {
      setFileError(e instanceof ProjectFileError ? e.message : 'Could not read the file.')
    }
  }

  function launchOpened(login?: Credentials) {
    if (!opened) return
    if (login) saveSharedCredentials(login)
    cmd.launch({ ...opened, projectors: login ? applyLoginToMissing(opened.projectors, login) : opened.projectors })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-background px-6 py-3">
        <div className="flex items-center gap-3">
          <AppLogoMenu size="lg" />
          <Badge>v{__APP_VERSION__}</Badge>
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatClock(now)}</span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        {gatewayMode === 'locked' && (
          <div role="alert" className="flex w-full max-w-2xl items-center justify-between gap-3 rounded-sm border border-warn/40 bg-warn/10 px-4 py-2 font-mono text-xs text-warn">
            The gateway is running but needs an access token — until then the app is only a simulation.
            <Button size="xs" variant="warn" onClick={() => setTokenOpen(true)}>ENTER TOKEN</Button>
          </div>
        )}
        {tokenOpen && <GatewayTokenDialog onClose={() => setTokenOpen(false)} />}
        {fileError && <p role="alert" className="w-full max-w-2xl rounded-sm border border-danger/40 bg-danger/10 px-4 py-2 font-mono text-xs text-danger">{fileError}</p>}
        {mode === 'choose' && <ChooseMode savedCount={saved.length} onNew={() => setMode('new')} onLoad={() => setMode('load')} onOpenFile={() => void openFile()} />}
        {mode === 'load' && <LoadProjectList projects={saved} onLoad={id => void cmd.openRecent(id)}
          onDelete={async id => { const ok = await cmd.deleteSaved(id); if (ok) setSaved(list => list.filter(p => p.id !== id)); return ok }} onOpenFile={() => void openFile()} onBack={() => setMode('choose')} />}
        {mode === 'file' && opened && <OpenFileStep snapshot={opened} onLaunch={launchOpened} onBack={() => setMode('choose')} />}
        {mode === 'new' && <NewProjectWizard key={location.key} onBack={() => setMode('choose')} onLaunch={cmd.launch} />}
      </main>

      <AppFooter left="MikMaster — Professional AV Control" right={<><GatewayBadge /><StatusDot tone="ok" className="size-1.5" />Network ready</>} />
    </div>
  )
}

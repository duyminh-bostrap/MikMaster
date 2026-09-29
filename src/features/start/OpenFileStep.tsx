import { FileJson } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import type { ProjectSnapshot } from '@/services/projectRepository'
import { countMissingLogins, type Credentials } from '@/utils/credentials'
import { LaunchPanel } from './LaunchPanel'
import { StepHeader } from './LoadProjectList'
import { t } from '@/i18n'

/** Sau khi mở file project: xem tóm tắt rồi LOGIN & LAUNCH (file không chứa mật khẩu) hoặc LAUNCH. */
export function OpenFileStep({ snapshot, onLaunch, onBack }: {
  snapshot: ProjectSnapshot
  onLaunch: (login?: Credentials) => void
  onBack: () => void
}) {
  const { project, booths, projectors } = snapshot
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-4 py-0.5 font-mono text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-foreground">{value}</span>
    </div>
  )
  return (
    <div className="w-full max-w-2xl">
      <StepHeader title={t('Open Project File')} onBack={onBack} />
      <div className="grid grid-cols-[1fr_300px] gap-5 max-md:grid-cols-1">
        <Panel title={t('PROJECT')} bodyClassName="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <FileJson size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{project.name}</p>
            </div>
          </div>
          <div>
            {row('DEVICES', String(projectors.length))}
            {row('BOOTHS', booths.map(b => b.name).join(', '))}
          </div>
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">{t('Project files never contain device passwords. Log in once for all devices, or launch and log in per device later.')}</p>
        </Panel>
        <LaunchPanel selected={projectors.length} loginTargets={countMissingLogins(projectors)} onLaunch={onLaunch} />
      </div>
    </div>
  )
}

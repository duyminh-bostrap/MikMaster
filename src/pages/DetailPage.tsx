import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { EditDialog } from '@/features/dashboard/EditDialogs'
import { BasicControls } from '@/features/detail/BasicControls'
import { DeviceStatus } from '@/features/detail/DeviceStatus'
import { NetworkEditor } from '@/features/detail/NetworkEditor'
import { DetailHeader } from '@/features/detail/DetailHeader'
import { LensPanel } from '@/features/detail/lens/LensPanel'
import { LensReading } from '@/features/detail/lens/LensReading'
import { PreviewPanel } from '@/features/detail/PreviewPanel'
import { TestPatternPanel } from '@/features/detail/TestPatternPanel'
import { AccountMenu } from '@/features/detail/AccountMenu'
import { Button } from '@/components/ui/Button'
import { CommandTemplatesPanel } from '@/features/detail/CommandTemplatesPanel'
import { InputPanel } from '@/features/detail/InputPanel'
import { RawConsole } from '@/features/detail/RawConsole'
import { UnavailableNotice } from '@/features/detail/UnavailableNotice'
import { useCapabilities } from '@/hooks/useCapabilities'
import { useOpenProject, useProjector } from '@/store/hooks'
import { useGateway } from '@/store/useGateway'
import { loginRequired } from '@/utils/credentials'
import { Lock } from 'lucide-react'
import { t } from '@/i18n'

const SIDE_PANEL = 'shrink-0 overflow-y-auto bg-card p-4 max-lg:overflow-visible'

export default function DetailPage() {
  const { projectorId } = useParams()
  const projector = useProjector(projectorId)

  if (!projector) return <Navigate to="/project" replace />
  return <DetailView projector={projector} />
}

function DetailView({ projector }: { projector: NonNullable<ReturnType<typeof useProjector>> }) {
  const { project, booths } = useOpenProject()
  const caps = useCapabilities(projector)
  const why = t('Not available over this connection yet: no command set verified against the manufacturer documentation. Use RAW COMMAND to try commands.')
  const [editing, setEditing] = useState(false)
  const { gateway } = useGateway()
  // Cần đăng nhập → ẩn các nút điều khiển, mở sẵn khung đăng nhập ở góc trên bên phải.
  const locked = loginRequired(projector, gateway !== null)
  const [accountOpen, setAccountOpen] = useState(locked)
  useEffect(() => { if (locked) setAccountOpen(true) }, [locked, projector.id])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background max-lg:h-auto max-lg:min-h-screen max-lg:overflow-visible">
      <DetailHeader project={project} booth={booths.find(b => b.id === projector.boothId)} projector={projector} onEdit={() => setEditing(true)}
        account={<AccountMenu projector={projector} locked={locked} open={accountOpen} onOpenChange={setAccountOpen} />} />
      {editing && <EditDialog target={{ kind: 'projector', id: projector.id }} onClose={() => setEditing(false)} />}

      <div className="flex min-h-0 flex-1 max-lg:flex-col">
        <aside className={`${SIDE_PANEL} w-64 border-r border-border max-lg:w-full max-lg:border-r-0 max-lg:border-b`}>
          {locked ? (
            <div className="mb-5 flex flex-col gap-2 rounded-sm border border-warn/40 bg-warn/5 p-3">
              <p className="flex items-center gap-1.5 font-mono text-xs text-warn"><Lock size={12} />{t('LOGIN REQUIRED')}</p>
              <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">{t('Sign in at the top right to control this projector.')}</p>
              <Button size="sm" variant="warn" onClick={() => setAccountOpen(true)}>{t('SIGN IN')}</Button>
            </div>
          ) : <BasicControls projector={projector} />}
          {/* key: form nháp được dựng lại khi chuyển sang máy khác */}
          <NetworkEditor key={projector.id} projector={projector} />
          <CommandTemplatesPanel key={`${projector.id}:${projector.network.protocol.type}:cmd`} projector={projector} />
          <DeviceStatus projector={projector} />
          {caps.raw && !locked && <div className="mt-5"><RawConsole projector={projector} /></div>}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <PreviewPanel projector={projector} />
          {locked ? (
            <div className="flex shrink-0 items-center gap-3 border-t border-border p-6 font-mono text-xs text-warn">
              <Lock size={14} />{t('Sign in to this projector (top right) to use Input, Test Pattern and Lens controls.')}
            </div>
          ) : (
          <div className="grid shrink-0 grid-cols-2 gap-8 border-t border-border p-6 pt-4 max-xl:grid-cols-1">
            <div>
              <InputPanel projector={projector} enabled={caps.input} />
            </div>
            <fieldset disabled={!caps.testPattern} className="contents">
              <div>
                {!caps.testPattern && <UnavailableNotice>{t('Add the test pattern ON / OFF commands in ADVANCED (left) — from the projector manual — to use test patterns on this projector.')}</UnavailableNotice>}
                <TestPatternPanel projector={projector} />
              </div>
            </fieldset>
          </div>
          )}
        </section>

        {!locked && <aside className={`${SIDE_PANEL} w-72 border-l border-border max-lg:w-full max-lg:border-t max-lg:border-l-0`}>
          {caps.live && <LensReading projector={projector} />}
          <fieldset disabled={!caps.lens} className="contents">
            {!caps.lens && <UnavailableNotice>{why}</UnavailableNotice>}
            <LensPanel projector={projector} />
          </fieldset>
        </aside>}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { EditDialog } from '@/features/dashboard/EditDialogs'
import { BasicControls } from '@/features/detail/BasicControls'
import { DeviceStatus } from '@/features/detail/DeviceStatus'
import { NetworkEditor } from '@/features/detail/NetworkEditor'
import { DetailHeader } from '@/features/detail/DetailHeader'
import { LensPanel } from '@/features/detail/lens/LensPanel'
import { PreviewPanel } from '@/features/detail/PreviewPanel'
import { TestPatternPanel } from '@/features/detail/TestPatternPanel'
import { AccountPanel } from '@/features/detail/AccountPanel'
import { CommandTemplatesPanel } from '@/features/detail/CommandTemplatesPanel'
import { InputPanel } from '@/features/detail/InputPanel'
import { RawConsole } from '@/features/detail/RawConsole'
import { UnavailableNotice } from '@/features/detail/UnavailableNotice'
import { useCapabilities } from '@/hooks/useCapabilities'
import { useOpenProject, useProjector } from '@/store/hooks'
import { useGateway } from '@/store/useGateway'
import { loginRequired } from '@/utils/credentials'
import { Lock } from 'lucide-react'

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
  const why = 'Not available over this connection yet: no command set verified against the manufacturer documentation. Use RAW COMMAND to try commands.'
  const [editing, setEditing] = useState(false)
  const { gateway } = useGateway()
  // Cần đăng nhập → chỉ hiện ô đăng nhập, ẩn các nút điều khiển. Đã đăng nhập → ẩn ô đăng nhập (đổi qua "Change" ở STATUS).
  const locked = loginRequired(projector, gateway !== null)
  const [changingLogin, setChangingLogin] = useState(false)
  const accountKey = `${projector.id}:${projector.network.protocol.type}`

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background max-lg:h-auto max-lg:min-h-screen max-lg:overflow-visible">
      <DetailHeader project={project} booth={booths.find(b => b.id === projector.boothId)} projector={projector} onEdit={() => setEditing(true)} />
      {editing && <EditDialog target={{ kind: 'projector', id: projector.id }} onClose={() => setEditing(false)} />}

      <div className="flex min-h-0 flex-1 max-lg:flex-col">
        <aside className={`${SIDE_PANEL} w-64 border-r border-border max-lg:w-full max-lg:border-r-0 max-lg:border-b`}>
          {locked
            ? <AccountPanel key={accountKey} projector={projector} mode="required" />
            : <BasicControls projector={projector} />}
          {!locked && changingLogin && <AccountPanel key={`${accountKey}:change`} projector={projector} mode="change" onDone={() => setChangingLogin(false)} />}
          {/* key: form nháp được dựng lại khi chuyển sang máy khác */}
          <NetworkEditor key={projector.id} projector={projector} />
          <CommandTemplatesPanel key={`${projector.id}:${projector.network.protocol.type}:cmd`} projector={projector} />
          <DeviceStatus projector={projector} onChangeLogin={locked ? undefined : () => setChangingLogin(true)} />
          {caps.raw && !locked && <div className="mt-5"><RawConsole projector={projector} /></div>}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <PreviewPanel projector={projector} />
          {locked ? (
            <div className="flex shrink-0 items-center gap-3 border-t border-border p-6 font-mono text-xs text-warn">
              <Lock size={14} />Sign in to this projector (left panel) to use Input, Test Pattern and Lens controls.
            </div>
          ) : (
          <div className="grid shrink-0 grid-cols-2 gap-8 border-t border-border p-6 pt-4 max-xl:grid-cols-1">
            <div>
              <InputPanel projector={projector} enabled={caps.input} />
            </div>
            <fieldset disabled={!caps.testPattern} className="contents">
              <div>
                {!caps.testPattern && <UnavailableNotice>{why}</UnavailableNotice>}
                <TestPatternPanel projector={projector} />
              </div>
            </fieldset>
          </div>
          )}
        </section>

        {!locked && <aside className={`${SIDE_PANEL} w-72 border-l border-border max-lg:w-full max-lg:border-t max-lg:border-l-0`}>
          <fieldset disabled={!caps.lens} className="contents">
            {!caps.lens && <UnavailableNotice>{why}</UnavailableNotice>}
            <LensPanel projector={projector} />
          </fieldset>
        </aside>}
      </div>
    </div>
  )
}

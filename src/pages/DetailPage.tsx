import { Navigate, useNavigate, useParams } from 'react-router'
import { BasicControls } from '@/features/detail/BasicControls'
import { DeviceStatus } from '@/features/detail/DeviceStatus'
import { NetworkEditor } from '@/features/detail/NetworkEditor'
import { DetailHeader } from '@/features/detail/DetailHeader'
import { LensPanel } from '@/features/detail/lens/LensPanel'
import { OsdPanel } from '@/features/detail/OsdPanel'
import { PreviewPanel } from '@/features/detail/PreviewPanel'
import { TestPatternPanel } from '@/features/detail/TestPatternPanel'
import { useOpenProject, useProjector } from '@/store/hooks'

const SIDE_PANEL = 'shrink-0 overflow-y-auto bg-card p-4 max-lg:overflow-visible'

export default function DetailPage() {
  const { projectorId } = useParams()
  const { project, booths } = useOpenProject()
  const projector = useProjector(projectorId)
  const navigate = useNavigate()

  if (!projector) return <Navigate to="/project" replace />

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background max-lg:h-auto max-lg:min-h-screen max-lg:overflow-visible">
      <DetailHeader project={project} booth={booths.find(b => b.id === projector.boothId)} projector={projector} onBack={() => navigate(-1)} />

      <div className="flex min-h-0 flex-1 max-lg:flex-col">
        <aside className={`${SIDE_PANEL} w-64 border-r border-border max-lg:w-full max-lg:border-r-0 max-lg:border-b`}>
          <BasicControls projector={projector} />
          {/* key: form nháp được dựng lại khi chuyển sang máy khác */}
          <NetworkEditor key={projector.id} projector={projector} />
          <DeviceStatus projector={projector} />
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <PreviewPanel projector={projector} />
          <div className="grid shrink-0 grid-cols-2 gap-8 border-t border-border p-6 pt-4 max-xl:grid-cols-1">
            <OsdPanel projector={projector} />
            <TestPatternPanel projector={projector} />
          </div>
        </section>

        <aside className={`${SIDE_PANEL} w-72 border-l border-border max-lg:w-full max-lg:border-t max-lg:border-l-0`}>
          <LensPanel projector={projector} />
        </aside>
      </div>
    </div>
  )
}

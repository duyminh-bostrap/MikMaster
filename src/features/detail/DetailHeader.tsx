import { ArrowLeft, Pencil } from 'lucide-react'
import { useNavigate } from 'react-router'
import { AppLogoMenu } from '@/features/appmenu/AppLogoMenu'
import { Badge } from '@/components/ui/Badge'
import { PowerDot } from '@/components/ui/StatusDot'
import { cn } from '@/utils/cn'
import { TONE_TEXT, temperatureTone } from '@/utils/tones'
import type { Booth, Project, Projector } from '@/types'

export function DetailHeader({ project, booth, projector, onEdit }: { project: Project; booth: Booth | undefined; projector: Projector; onEdit: () => void }) {
  const navigate = useNavigate()
  const crumb = 'text-muted-foreground transition-colors hover:text-foreground'
  const tempTone = temperatureTone(projector.telemetry.temperatureC)
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border bg-background px-5 py-2.5">
      <div className="flex items-center gap-3 font-mono text-xs">
        <AppLogoMenu size="sm" />
        <div className="h-4 w-px bg-border" />
        <button type="button" onClick={() => navigate('/project')} title="All projectors" className={`flex items-center gap-1.5 ${crumb}`}>
          <ArrowLeft size={11} strokeWidth={2.5} />
          {project.name}
        </button>
        <span className="text-border">/</span>
        {booth
          ? <button type="button" onClick={() => navigate(`/project?booth=${encodeURIComponent(booth.id)}`)} title={`Projectors in ${booth.name}`} className={crumb}>{booth.name}</button>
          : <span className="text-muted-foreground">{projector.boothId}</span>}
        <span className="text-border">/</span>
        <button type="button" onClick={onEdit} title="Edit name, location, booth" className="group flex items-center gap-1.5 font-medium text-foreground">
          {projector.name}
          <Pencil size={10} className="text-muted-foreground transition-colors group-hover:text-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-4 font-mono text-xs">
        <span className={cn('flex items-center gap-1.5 uppercase', projector.power === 'on' ? 'text-ok' : 'text-muted-foreground')}>
          <PowerDot power={projector.power} />
          {projector.power === 'on' ? 'ON' : 'OFF'}
        </span>
        {projector.telemetry.temperatureC > 0 && <span className={TONE_TEXT[tempTone]}>{projector.telemetry.temperatureC}°C</span>}
        <span className="text-accent">{projector.network.ip}</span>
        {projector.errors.length > 0 && <Badge tone="danger">⚠ {projector.errors[0]}</Badge>}
      </div>
    </header>
  )
}

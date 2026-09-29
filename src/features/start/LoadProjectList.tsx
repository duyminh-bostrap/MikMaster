import { ArrowLeft, FileUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatShortDate } from '@/utils/format'
import type { SavedProjectSummary } from '@/types'

export function LoadProjectList({ projects, onLoad, onOpenFile, onBack }: {
  projects: SavedProjectSummary[]
  onLoad: (id: string) => void
  onOpenFile: () => void
  onBack: () => void
}) {
  return (
    <div className="w-full max-w-2xl">
      <StepHeader title="Load Project" onBack={onBack}
        aside={<Button variant="accent" className="ml-auto" onClick={onOpenFile}><FileUp size={12} />OPEN FILE…</Button>} />
      <div className="flex flex-col gap-3">
        {projects.map(sp => (
          <button key={sp.id} type="button" onClick={() => onLoad(sp.id)}
            className="flex items-center justify-between rounded-sm border border-border bg-card p-4 text-left transition-colors hover:border-primary/40">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">{sp.name}</span>
              <div className="mt-1 flex items-center gap-3 font-mono text-xs">
                <span className="text-accent">{sp.deviceCount} devices</span>
                <span className="text-muted-foreground">Saved {formatShortDate(sp.savedAt)}</span>
              </div>
            </div>
            <span className="font-mono text-xs text-primary">LOAD →</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function StepHeader({ title, onBack, aside }: { title: string; onBack: () => void; aside?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <button type="button" onClick={onBack} className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft size={12} strokeWidth={2.5} />BACK
      </button>
      <div className="h-4 w-px bg-border" />
      <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
      {aside}
    </div>
  )
}

import { ArrowLeft, FileUp, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { isSampleProject } from '@/services/projectRepository'
import { Button } from '@/components/ui/Button'
import { formatShortDate } from '@/utils/format'
import type { SavedProjectSummary } from '@/types'

export function LoadProjectList({ projects, onLoad, onDelete, onOpenFile, onBack }: {
  projects: SavedProjectSummary[]
  onLoad: (id: string) => void
  /** Trả `false` nếu không xoá được. */
  onDelete: (id: string) => Promise<boolean>
  onOpenFile: () => void
  onBack: () => void
}) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  return (
    <div className="w-full max-w-2xl">
      <StepHeader title="Load Project" onBack={onBack}
        aside={<Button variant="accent" className="ml-auto" onClick={onOpenFile}><FileUp size={12} />OPEN FILE…</Button>} />
      <div className="flex flex-col gap-3">
        {projects.length === 0 && <p className="font-mono text-xs text-muted-foreground">No saved projects yet.</p>}
        {projects.map(sp => (
          <div key={sp.id} className="group flex items-stretch rounded-sm border border-border bg-card transition-colors hover:border-primary/40">
            <button type="button" onClick={() => onLoad(sp.id)} className="flex flex-1 items-center justify-between p-4 text-left">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-foreground">
                  {sp.name}{isSampleProject(sp.id) && <span className="ml-2 font-mono text-[10px] font-normal text-muted-foreground">SAMPLE</span>}
                </span>
                <div className="mt-1 flex items-center gap-3 font-mono text-xs">
                  <span className="text-accent">{sp.deviceCount} devices</span>
                  <span className="text-muted-foreground">Saved {formatShortDate(sp.savedAt)}</span>
                </div>
                {failed === sp.id && <span role="alert" className="font-mono text-[10px] text-danger">Could not delete this project.</span>}
              </div>
              <span className="font-mono text-xs text-primary">LOAD →</span>
            </button>
            {!isSampleProject(sp.id) && (
              confirming === sp.id ? (
                <div className="flex items-center gap-1.5 border-l border-border px-3">
                  <span className="font-mono text-[10px] text-danger">Delete?</span>
                  <Button size="xs" variant="danger" onClick={async () => { setConfirming(null); setFailed((await onDelete(sp.id)) ? null : sp.id) }}>YES</Button>
                  <Button size="xs" onClick={() => setConfirming(null)}>NO</Button>
                </div>
              ) : (
                <button type="button" aria-label={`Delete ${sp.name}`} title="Delete saved project" onClick={() => setConfirming(sp.id)}
                  className="border-l border-border px-3 text-muted-foreground opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100">
                  <Trash2 size={13} />
                </button>
              )
            )}
          </div>
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

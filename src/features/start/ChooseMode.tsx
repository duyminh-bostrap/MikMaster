import { FolderOpen, Plus } from 'lucide-react'
import type { ReactNode } from 'react'

function ModeCard({ icon, tone, kicker, title, description, cta, onClick }: {
  icon: ReactNode
  tone: 'primary' | 'accent'
  kicker: string
  title: string
  description: string
  cta: string
  onClick: () => void
}) {
  const iconBox = tone === 'primary' ? 'border-primary/25 bg-primary/10 text-primary' : 'border-accent/25 bg-accent/10 text-accent'
  const ctaColor = tone === 'primary' ? 'text-primary' : 'text-accent'
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-start rounded-sm border border-border bg-card p-6 text-left transition-colors hover:border-muted-foreground/40">
      <div className={`mb-4 flex size-10 items-center justify-center rounded-sm border ${iconBox}`}>{icon}</div>
      <span className="mb-1 font-mono text-xs tracking-[0.1em] text-muted-foreground">{kicker}</span>
      <span className="mb-2 text-sm font-medium text-foreground">{title}</span>
      <span className="text-xs leading-relaxed text-muted-foreground">{description}</span>
      <span className={`mt-4 font-mono text-xs ${ctaColor}`}>{cta}</span>
    </button>
  )
}

export function ChooseMode({ savedCount, onNew, onLoad }: { savedCount: number; onNew: () => void; onLoad: () => void }) {
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-8">
      <div className="text-center">
        <p className="mb-3 font-mono text-xs tracking-[0.2em] text-accent">AV CONTROL SYSTEM</p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-foreground">Start a Session</h1>
        <p className="mx-auto max-w-[440px] text-sm text-muted-foreground">
          Create a new project or load a saved configuration to resume controlling your projector fleet.
        </p>
      </div>
      <div className="grid w-full grid-cols-2 gap-4">
        <ModeCard tone="primary" icon={<Plus size={18} />} kicker="NEW PROJECT" title="Create & Scan"
          description="Set up a fresh project, scan your network for projectors, and assign them to booths."
          cta="Start from scratch →" onClick={onNew} />
        <ModeCard tone="accent" icon={<FolderOpen size={18} />} kicker="LOAD PROJECT" title="Resume Session"
          description="Restore a previously saved project including IP list, booth configuration, and all lens presets."
          cta={`${savedCount} saved projects →`} onClick={onLoad} />
      </div>
      <p className="font-mono text-xs text-muted-foreground">PJLink · Christie · Barco · Epson · Sony · Panasonic</p>
    </div>
  )
}

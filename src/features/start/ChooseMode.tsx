import { FileUp, FolderOpen, Plus } from 'lucide-react'
import { FILE_EXTENSION } from '@/services/projectFile'
import type { ReactNode } from 'react'
import { t } from '@/i18n'

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

export function ChooseMode({ savedCount, onNew, onLoad, onOpenFile }: { savedCount: number; onNew: () => void; onLoad: () => void; onOpenFile: () => void }) {
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-8">
      <div className="text-center">
        <p className="mb-3 font-mono text-xs tracking-[0.2em] text-accent">{t('AV CONTROL SYSTEM')}</p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-foreground">{t('Start a Session')}</h1>
        <p className="mx-auto max-w-[440px] text-sm text-muted-foreground">
          {t('Create a new project or load a saved configuration to resume controlling your projector fleet.')}
        </p>
      </div>
      <div className="grid w-full grid-cols-2 gap-4">
        <ModeCard tone="primary" icon={<Plus size={18} />} kicker={t('NEW PROJECT')} title={t('Create & Scan')}
          description={t('Set up a fresh project, scan your network for projectors, and assign them to booths.')}
          cta={t('Start from scratch →')} onClick={onNew} />
        <ModeCard tone="accent" icon={<FolderOpen size={18} />} kicker={t('LOAD PROJECT')} title={t('Resume Session')}
          description={t('Restore a previously saved project including IP list, booth configuration, and all lens presets.')}
          cta={t('{n} saved projects →', { n: savedCount })} onClick={onLoad} />
      </div>
      <button type="button" onClick={onOpenFile} className="flex items-center gap-2 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
        <FileUp size={13} />{t('Open a project file ({ext}) from this computer', { ext: FILE_EXTENSION })}
      </button>
      <p className="font-mono text-xs text-muted-foreground">{t('PJLink · Christie · Barco · Epson · Sony · Panasonic')}</p>
    </div>
  )
}

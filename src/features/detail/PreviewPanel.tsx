import { PreviewScreen } from '@/components/projector/PreviewScreen'
import type { Projector } from '@/types'

export function PreviewPanel({ projector }: { projector: Projector }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-[640px]">
        <PreviewScreen projector={projector} size="lg" />
        <div className="mt-2 flex items-center justify-between px-1 font-mono text-xs text-muted-foreground">
          <span>{projector.name} · {projector.location}</span>
          <span>{projector.id}</span>
        </div>
      </div>
    </div>
  )
}

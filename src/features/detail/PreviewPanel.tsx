import { PreviewScreen } from '@/components/projector/PreviewScreen'
import { useLivePreview } from '@/hooks/useLivePreview'
import type { Projector } from '@/types'
import { t } from '@/i18n'

/** Trang máy: đọc lại mỗi giây (web của máy cũng tải lại liên tục như vậy). */
const PREVIEW_MS = 1000

export function PreviewPanel({ projector }: { projector: Projector }) {
  const { live, supported, hasAccount } = useLivePreview(projector, PREVIEW_MS)
  const image = live.kind === 'ok' && live.preview.state === 'image' ? live.preview.image : undefined

  let note: string | null = null
  if (supported && projector.power === 'on') {
    if (!hasAccount) note = t('Sign in with the projector web account (top right) to see the live preview.')
    else if (live.kind === 'error') note = t('Live preview unavailable: {message}', { message: live.message })
    else if (live.kind === 'ok' && live.preview.state === 'no-signal') note = t('No signal on {input}', { input: live.preview.input ?? projector.input })
    else if (live.kind === 'ok' && live.preview.state === 'no-thumbnail') note = t('The projector has no preview image for this input')
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-[640px]">
        {image ? (
          <div className="relative aspect-video overflow-hidden rounded-sm border border-border bg-black">
            <img src={image} alt={t('Live preview from the projector')} className="size-full object-contain" />
            <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-sm bg-black/60 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.15em] text-ok">
              <span className="size-1.5 animate-pulse rounded-full bg-ok" />{t('LIVE PREVIEW')}
            </span>
            {live.kind === 'ok' && live.preview.resolution && (
              <span className="absolute top-2 right-2 rounded-sm bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white/70">{live.preview.resolution}</span>
            )}
          </div>
        ) : <PreviewScreen projector={projector} size="lg" />}
        {note && <p className="mt-2 px-1 font-mono text-[10px] text-muted-foreground">{note}</p>}
        <div className="mt-2 flex items-center justify-between px-1 font-mono text-xs text-muted-foreground">
          <span>{projector.name} · {projector.model}</span>
          <span>{projector.id}</span>
        </div>
      </div>
    </div>
  )
}

import { Button } from '@/components/ui/Button'
import { PreviewNotice } from '@/components/projector/PreviewNotice'
import { PreviewScreen } from '@/components/projector/PreviewScreen'
import { ProNotice } from './ProNotice'
import { useLivePreview } from '@/hooks/useLivePreview'
import { setPreshowWanted, usePreshowWanted } from '@/services/preshow'
import { useGateway } from '@/store/useGateway'
import type { Projector } from '@/types'
import { t } from '@/i18n'

/** Trang máy: đọc lại mỗi giây (web của máy cũng tải lại liên tục như vậy). */
const PREVIEW_MS = 1000

export function PreviewPanel({ projector }: { projector: Projector }) {
  const { live, supported, hasAccount, proLocked, preshowCapable } = useLivePreview(projector, PREVIEW_MS)
  const { gateway } = useGateway()
  const wanted = usePreshowWanted(projector.id)
  const standby = projector.power !== 'on' && projector.connection === 'connected'
  function togglePreshow() {
    const next = !wanted
    setPreshowWanted(projector.id, next)
    // Tắt: trả máy về như cũ ngay (bật thì vòng đọc ảnh tự gửi yêu cầu).
    if (!next && gateway) void gateway.preview(projector, { preshow: false })
  }
  const image = live.kind === 'ok' && live.preview.state === 'image' ? live.preview.image : undefined
  const hdcp = live.kind === 'ok' && live.preview.state === 'hdcp'

  let note: string | null = null
  if (supported && standby && preshowCapable && !wanted) note = t('The projector is off. Turn on Pre-Show mode to see the picture without projecting.')
  else if (supported && (projector.power === 'on' || wanted)) {
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
        ) : hdcp ? <PreviewNotice size="lg">{t('HDCP-protected content')}</PreviewNotice>
        : <PreviewScreen projector={projector} size="lg" />}
        {proLocked && <div className="mt-2"><ProNotice>{t('Live preview is a MikMaster Pro feature. Enter a license key to unlock it.')}</ProNotice></div>}
        {preshowCapable && standby && (
          <div className="mt-2 flex items-center gap-3">
            <Button size="sm" variant="accent" selected={wanted} aria-pressed={wanted} onClick={togglePreshow}>{t('PRE-SHOW MODE')}{wanted ? ` · ${t('ON')}` : ''}</Button>
            <p className="font-mono text-[10px] leading-snug text-muted-foreground">{t('Shows the picture while the projector is off. This changes the projector\'s Pre-Show setting while you watch; MikMaster switches it back when you stop.')}</p>
          </div>
        )}
        {note && <p className="mt-2 px-1 font-mono text-[10px] text-muted-foreground">{note}</p>}
        <div className="mt-2 flex items-center justify-between px-1 font-mono text-xs text-muted-foreground">
          <span>{projector.name} · {projector.model}</span>
          <span>{projector.id}</span>
        </div>
      </div>
    </div>
  )
}

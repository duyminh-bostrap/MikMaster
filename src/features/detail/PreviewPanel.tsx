import { useEffect, useRef, useState } from 'react'
import type { PreviewDto } from '../../../shared/api.ts'
import { PreviewScreen } from '@/components/projector/PreviewScreen'
import { useCapabilities } from '@/hooks/useCapabilities'
import { useGateway } from '@/store/useGateway'
import type { Projector } from '@/types'
import { t } from '@/i18n'

/** Ảnh thật đọc lại mỗi giây (máy chỉ cho ảnh thu nhỏ; web của máy cũng tải lại liên tục như vậy). */
const PREVIEW_MS = 1000

type Live =
  | { kind: 'idle' }
  | { kind: 'ok'; preview: PreviewDto }
  | { kind: 'error'; code: string; message: string }

/**
 * Hình trực tiếp khi máy hỗ trợ (Christie: qua web, cần tài khoản web); còn lại là ô mô phỏng.
 * Sai / thiếu tài khoản → dừng hỏi cho tới khi đổi tài khoản (không gửi lại mật khẩu sai liên tục).
 */
function useLivePreview(p: Projector, enabled: boolean): Live {
  const { gateway } = useGateway()
  const [live, setLive] = useState<Live>({ kind: 'idle' })
  const { username, password } = p.network.protocol
  const on = p.power === 'on' && p.connection === 'connected'
  const latest = useRef(p)
  latest.current = p

  useEffect(() => {
    setLive({ kind: 'idle' })
    if (!gateway || !enabled || !on || (!username && !password)) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    async function tick() {
      const r = await gateway!.preview(latest.current)
      if (cancelled) return
      if (r.ok) setLive({ kind: 'ok', preview: r.value })
      else setLive({ kind: 'error', code: r.code, message: r.message })
      if (!r.ok && r.code === 'auth') return
      timer = setTimeout(tick, PREVIEW_MS)
    }
    void tick()
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ khởi động lại khi đổi máy / tài khoản / trạng thái
  }, [gateway, enabled, on, p.id, p.network.ip, username, password])

  return live
}

export function PreviewPanel({ projector }: { projector: Projector }) {
  const caps = useCapabilities(projector)
  const live = useLivePreview(projector, caps.preview)
  const { username, password } = projector.network.protocol
  const image = live.kind === 'ok' && live.preview.state === 'image' ? live.preview.image : undefined

  let note: string | null = null
  if (caps.preview && projector.power === 'on') {
    if (!username && !password) note = t('Sign in with the projector web account (top right) to see the live preview.')
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

import { useT } from '@/i18n'
import { useLivePreview } from '@/hooks/useLivePreview'
import type { Projector } from '@/types'
import { PreviewNotice } from './PreviewNotice'
import { PreviewScreen } from './PreviewScreen'

/** Thumbnail cao 90px của một máy: ảnh thật từ máy (nếu có), khung HDCP, hoặc khung mô phỏng. Dùng ở thẻ Dashboard và sơ đồ 2D. */
export function ProjectorThumb({ projector: p, intervalMs }: { projector: Projector; intervalMs: number }) {
  const t = useT()
  const { live } = useLivePreview(p, intervalMs)
  const image = live.kind === 'ok' && live.preview.state === 'image' ? live.preview.image : undefined
  const hdcp = live.kind === 'ok' && live.preview.state === 'hdcp'
  if (image) return <div className="relative h-[90px] overflow-hidden bg-black"><img src={image} alt="" draggable={false} className="size-full object-cover" /><span className="absolute top-1 left-1.5 size-1.5 animate-pulse rounded-full bg-ok" /></div>
  if (hdcp) return <PreviewNotice size="sm">{t('HDCP-protected content')}</PreviewNotice>
  return <PreviewScreen projector={p} size="sm" />
}

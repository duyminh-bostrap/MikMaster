import { SectionHeader } from '@/components/ui/SectionHeader'
import { formatSigned } from '@/utils/format'
import type { Projector } from '@/types'
import { t } from '@/i18n'

/** Vị trí ống kính thật máy báo (chỉ đọc, đơn vị của máy — máy không báo dải giá trị nên không đổi ra %). */
export function LensReading({ projector: p }: { projector: Projector }) {
  const r = p.telemetry.lensReading
  if (!r) return null
  const rows: [string, number | undefined][] = [
    [t('SHIFT H'), r.shiftH], [t('SHIFT V'), r.shiftV], [t('ZOOM'), r.zoom], [t('FOCUS'), r.focus],
  ]
  return (
    <div className="mb-5">
      <SectionHeader label={t('LENS POSITION (FROM PROJECTOR)')} />
      <div className="grid grid-cols-2 gap-2">
        {rows.map(([label, v]) => (
          <div key={label} className="rounded-sm border border-border bg-background px-2.5 py-2">
            <div className="font-mono text-[9px] tracking-[0.1em] text-muted-foreground">{label}</div>
            <div className="font-mono text-lg leading-tight font-bold tabular-nums text-foreground">{v === undefined ? '—' : formatSigned(v)}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">{t('Read-only, in the projector\'s own units. Updated every few seconds.')}</p>
    </div>
  )
}

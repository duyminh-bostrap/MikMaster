import { RefreshCw } from 'lucide-react'
import { useT } from '@/i18n'
import { useRefreshAll } from '@/store/useRefreshAll'
import { cn } from '@/utils/cn'

/** Nút "Làm mới": đọc lại ngay trạng thái của tất cả máy chiếu. Chỉ hiện khi có gateway (chế độ mô phỏng không có gì để đọc). */
export function RefreshAllButton() {
  const t = useT()
  const { available, refresh, refreshing, result } = useRefreshAll()
  if (!available) return null
  const time = result ? new Date(result.at).toLocaleTimeString([], { hour12: false }) : ''
  const detail = result
    ? `${t('Updated {time}', { time })} · ${t('{ok} answered, {failed} did not', { ok: result.ok, failed: result.failed })}${result.needLogin ? ` · ${t('{n} need a login', { n: result.needLogin })}` : ''}`
    : t('Read the status of every projector now')
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label={t('Refresh all projectors')} title={`${t('Refresh all projectors')} — ${detail}`} disabled={refreshing} onClick={() => void refresh()}
        className="flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent disabled:cursor-wait disabled:opacity-70">
        <RefreshCw size={11} className={cn(refreshing && 'animate-spin')} />
        {t('REFRESH')}
      </button>
      {result && !refreshing && <span role="status" className="hidden font-mono text-[10px] text-muted-foreground sm:inline">{time}{result.failed > 0 && <span className="ml-1 text-danger">· {result.failed} ✕</span>}</span>}
    </div>
  )
}

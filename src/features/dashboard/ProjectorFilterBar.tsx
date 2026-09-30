import { ChevronsDownUp, ChevronsUpDown, LayoutList, Map as MapIcon, Search, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useT } from '@/i18n'
import type { AllView } from '@/services/dashboardView'
import { RefreshAllButton } from './RefreshAllButton'
import { cn } from '@/utils/cn'
import { STATUS_FILTERS, type StatusFilter } from '@/utils/projectorFilter'

const STATUS_LABEL: Record<StatusFilter, string> = { all: 'All', on: 'On', off: 'Off', alerts: 'Alerts', offline: 'Offline' }

/** Lọc theo trạng thái (trái) + tìm nhanh (phải; phím "/" để vào ô tìm). */
export function ProjectorFilterBar({ query, onQuery, status, onStatus, counts, view, onView, onCollapseAll, onExpandAll }: {
  query: string
  onQuery: (q: string) => void
  status: StatusFilter
  onStatus: (s: StatusFilter) => void
  counts: Record<StatusFilter, number>
  /** Chỉ tab All có hai cách xem: theo group (thu gọn được) hoặc sơ đồ 2D. */
  view?: AllView
  onView?: (v: AllView) => void
  onCollapseAll?: () => void
  onExpandAll?: () => void
}) {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); input.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-5 py-2">
      <div role="radiogroup" aria-label={t('Filter by status')} className="flex flex-wrap gap-1">
        {STATUS_FILTERS.map(s => (
          <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => onStatus(s)}
            className={cn('rounded-sm border px-2 py-1 font-mono text-[10px] transition-colors',
              status === s ? 'border-accent/50 bg-accent/10 text-accent' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {t(STATUS_LABEL[s])}<span className="ml-1 opacity-70">{counts[s]}</span>
          </button>
        ))}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-3">
      {view && onView && (
        <>
          {view === 'groups' && onCollapseAll && onExpandAll && (
            <div className="flex gap-1">
              <button type="button" onClick={onCollapseAll} title={t('Collapse all groups')} aria-label={t('Collapse all groups')} className="rounded-sm border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground"><ChevronsDownUp size={12} /></button>
              <button type="button" onClick={onExpandAll} title={t('Expand all groups')} aria-label={t('Expand all groups')} className="rounded-sm border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground"><ChevronsUpDown size={12} /></button>
            </div>
          )}
          <div role="radiogroup" aria-label={t('View')} className="flex overflow-hidden rounded-sm border border-border">
            {([['groups', LayoutList, 'Groups'], ['map', MapIcon, '2D map']] as const).map(([v, Icon, label]) => (
              <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => onView(v)}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[10px] transition-colors', view === v ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground')}>
                <Icon size={11} />{t(label)}
              </button>
            ))}
          </div>
        </>
      )}
      <RefreshAllButton />
      <div className="relative w-64 max-w-full">
        <Search size={12} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
        <input ref={input} type="search" value={query} onChange={e => onQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { onQuery(''); input.current?.blur() } }}
          placeholder={t('Search name, IP, model…  ( / )')} aria-label={t('Search projectors')}
          className="w-full rounded-sm border border-border bg-muted py-1.5 pr-7 pl-7 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60" />
        {query && (
          <button type="button" aria-label={t('Clear search')} onClick={() => onQuery('')}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={11} /></button>
        )}
      </div>
      </div>
    </div>
  )
}

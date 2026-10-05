import { ChevronDown, ChevronUp, Download, SquareTerminal } from 'lucide-react'
import { useEffect } from 'react'
import { getPrefs, usePref } from '@/services/prefs'
import { saveTextFile } from '@/services/saveFile'
import { collectLog, formatLog, logFileName } from '@/utils/logExport'
import { cn } from '@/utils/cn'
import { formatClock } from '@/utils/format'
import type { Projector } from '@/types'
import { RawConsole } from './RawConsole'
import { t } from '@/i18n'

const LEVEL_TONE = { info: 'text-muted-foreground', warn: 'text-warn', error: 'text-danger' } as const
type Tab = 'log' | 'raw'

function LogView({ projector: p }: { projector: Projector }) {
  return (
    <div className="h-full overflow-y-auto px-3 py-2 font-mono text-xs leading-snug">
      {p.log.length === 0 && <p className="text-muted-foreground">{t('No events')}</p>}
      {p.log.map(e => (
        <div key={e.id}>
          <span className="text-muted-foreground">{formatClock(new Date(e.at))} </span>
          <span className={LEVEL_TONE[e.level]}>{e.message}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Một nút TERMINAL ở đáy trang máy (phím tắt Ctrl+`) mở ngăn có hai thẻ: LOG (nhật ký sự kiện) và RAW COMMAND (gửi lệnh thô).
 * Thu gọn thì chỉ còn một thanh mỏng; số lỗi chưa xem hiện ngay trên nút. Cả hai thẻ giữ nguyên nội dung khi chuyển qua lại.
 */
export function TerminalDock({ projector, raw, projectName }: { projector: Projector; raw: boolean; projectName: string }) {
  const [open, setOpen] = usePref('terminalOpen')
  const [tab, setTab] = usePref('terminalTab')
  const active: Tab = tab === 'raw' && !raw ? 'log' : tab
  const errors = projector.log.filter(e => e.level === 'error').length

  /** File log RIÊNG của máy này. */
  function saveLog() {
    const exportedAt = new Date()
    saveTextFile(logFileName(projectName, exportedAt, projector), formatLog({ projectName, scope: `${projector.id} ${projector.name} (${projector.network.ip})`, lines: collectLog([projector]), exportedAt }))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.ctrlKey && e.key === '`') { e.preventDefault(); setOpen(!getPrefs().terminalOpen) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  const tabBtn = (id: Tab, label: string) => (
    <button key={id} type="button" role="tab" aria-selected={active === id} onClick={() => setTab(id)}
      className={cn('border-b-2 px-3 py-1 font-mono text-[10px] tracking-[0.1em] transition-colors', active === id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
      {label}
    </button>
  )

  return (
    <div className="shrink-0 border-t border-border bg-card">
      <div className="flex items-center gap-1 pr-2">
        <button type="button" aria-expanded={open} aria-controls="terminal-dock" onClick={() => setOpen(!open)} title={`${t('Terminal')} (Ctrl+\`)`}
          className="flex items-center gap-2 px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground">
          <SquareTerminal size={12} />{t('TERMINAL')}
          {errors > 0 && <span className="rounded-sm bg-danger/20 px-1 text-danger">{errors}</span>}
          {open ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
        </button>
        {open && <div role="tablist" aria-label={t('Terminal')} className="flex">{tabBtn('log', t('LOG'))}{raw && tabBtn('raw', t('RAW COMMAND'))}</div>}
        {open && active === 'log' && (
          <button type="button" onClick={saveLog} title={t('Save this projector\'s log as a file')}
            className="ml-auto flex items-center gap-1.5 rounded-sm border border-border px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground">
            <Download size={11} />{t('SAVE LOG')}
          </button>
        )}
      </div>
      {/* Giữ cả hai thẻ trong DOM (ẩn bằng hidden) để lịch sử lệnh không mất khi chuyển thẻ. */}
      <div id="terminal-dock" hidden={!open} className="h-56 border-t border-border bg-background">
        <div hidden={active !== 'log'} className="h-full"><LogView projector={projector} /></div>
        {raw && <div hidden={active !== 'raw'} className="h-full"><RawConsole projector={projector} /></div>}
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useGateway } from '@/store/useGateway'
import type { Projector } from '@/types'
import { t } from '@/i18n'

const RAW_HINTS: Partial<Record<Projector['network']['protocol']['type'], string>> = {
  'panasonic-nt-control': 'e.g. QPW',
  'christie-serial-ip': 'e.g. (PWR?)',
  'barco-pulse': 'e.g. property.get {"property":"system.state"}',
  'generic-tcp': 'e.g. PWR ON\\r\\n  (\\r \\n \\xHH)',
  'generic-udp': 'e.g. ping  (\\r \\n \\xHH)',
  'art-net': 'e.g. 0 1=255 5-8=128  (universe ch=value)',
  'http-api': 'e.g. GET /api/status  |  POST /path {"on":true}',
}

interface Line { id: number; kind: 'tx' | 'rx' | 'err'; text: string }

/**
 * Gửi nguyên văn lệnh của hãng và xem phản hồi thô — để đối chiếu lệnh với máy thật
 * (đặc biệt Lens / Test Pattern mà app chưa bật vì chưa xác minh).
 */
export function RawConsole({ projector: p }: { projector: Projector }) {
  const { gateway } = useGateway()
  const [text, setText] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [busy, setBusy] = useState(false)
  const hint = RAW_HINTS[p.network.protocol.type] ?? 'e.g. %1POWR ?'

  async function send() {
    const cmd = text.trim()
    if (!gateway || !cmd || busy) return
    setBusy(true)
    const push = (kind: Line['kind'], t: string) => setLines(prev => [{ id: prev.length + 1 + Math.random(), kind, text: t }, ...prev].slice(0, 30))
    push('tx', cmd)
    const r = await gateway.raw(p, cmd)
    push(r.ok ? 'rx' : 'err', r.ok ? r.value : `${r.code}: ${r.message}`)
    setBusy(false)
    setText('')
  }

  // Terminal: dòng mới ở cuối, tự cuộn xuống.
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'end' }) }, [lines])
  const ordered = [...lines].reverse()

  return (
    <div className="flex h-full min-h-0 flex-col font-mono text-xs">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 leading-snug">
        {ordered.length === 0 && <p className="text-muted-foreground">{t('Type a vendor command below and press Enter. Replies appear here.')}</p>}
        {ordered.map(l => (
          <div key={l.id} className={l.kind === 'err' ? 'text-danger' : l.kind === 'rx' ? 'text-ok' : 'text-muted-foreground'}>
            {l.kind === 'tx' ? '> ' : '< '}{l.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-1.5">
        <span className="text-accent" aria-hidden>&gt;</span>
        <input aria-label={t('Raw command')} value={text} placeholder={hint} autoComplete="off" spellCheck={false}
          onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && void send()}
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/60" />
        <button type="button" disabled={busy || !text.trim()} onClick={() => void send()}
          className="rounded-sm border border-accent/40 px-2 py-0.5 text-[10px] tracking-[0.1em] text-accent transition-colors enabled:hover:bg-accent/10 disabled:opacity-40">{t('SEND')}</button>
      </div>
    </div>
  )
}

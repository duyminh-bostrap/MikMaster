import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { SectionHeader } from '@/components/ui/SectionHeader'
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

  return (
    <>
      <SectionHeader label={t('RAW COMMAND')} />
      <div className="flex gap-1.5">
        <TextInput aria-label={t('Raw command')} value={text} placeholder={hint} className="px-2 py-1.5 text-xs" onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && void send()} />
        <Button variant="accent" disabled={busy || !text.trim()} onClick={() => void send()}>{t('SEND')}</Button>
      </div>
      <ul className="mt-2 flex max-h-32 flex-col gap-1 overflow-y-auto font-mono text-[10px] leading-snug">
        {lines.map(l => (
          <li key={l.id} className={l.kind === 'err' ? 'text-danger' : l.kind === 'rx' ? 'text-ok' : 'text-muted-foreground'}>
            {l.kind === 'tx' ? '> ' : '< '}{l.text}
          </li>
        ))}
      </ul>
    </>
  )
}

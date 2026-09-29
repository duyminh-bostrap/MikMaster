import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useGateway } from '@/store/useGateway'
import type { Projector } from '@/types'

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
  const hint = p.network.protocol.type === 'panasonic-nt-control' ? 'e.g. QPW' : p.network.protocol.type === 'christie-serial-ip' ? 'e.g. (PWR?)' : 'e.g. %1POWR ?'

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
      <SectionHeader label="RAW COMMAND" />
      <div className="flex gap-1.5">
        <TextInput aria-label="Raw command" value={text} placeholder={hint} className="px-2 py-1.5 text-xs" onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && void send()} />
        <Button variant="accent" disabled={busy || !text.trim()} onClick={() => void send()}>SEND</Button>
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

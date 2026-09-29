import { useState } from 'react'
import { TEMPLATE_KEYS, TEMPLATE_PROTOCOLS, type CommandTemplates } from '../../../shared/api.ts'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Field'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useProjectActions } from '@/store/hooks'
import { appendLog } from '@/utils/projector'
import type { Projector } from '@/types'

const LABEL: Record<(typeof TEMPLATE_KEYS)[number], string> = {
  powerOn: 'POWER ON', powerOff: 'POWER OFF', shutterClose: 'SHUTTER CLOSE', shutterOpen: 'SHUTTER OPEN',
}

const EXAMPLE: Record<string, Partial<CommandTemplates>> = {
  'generic-tcp': { powerOn: 'PWR ON\\r', powerOff: 'PWR OFF\\r' },
  'generic-udp': { powerOn: 'PWR ON\\r', powerOff: 'PWR OFF\\r' },
  'art-net': { powerOn: '0 1=255', powerOff: '0 1=0' },
  'http-api': { powerOn: 'POST /api/power {"on":true}', powerOff: 'POST /api/power {"on":false}' },
}

const SYNTAX: Record<string, string> = {
  'generic-tcp': 'Text sent as-is; use \\r \\n \\xHH for control characters.',
  'generic-udp': 'One datagram; use \\r \\n \\xHH for control characters.',
  'art-net': '[universe] channel=value … e.g. "0 1=255 5-8=128".',
  'http-api': '"GET /path" or "POST /path body" (login from the Account section).',
}

/**
 * Giao thức chung không có bộ lệnh chuẩn: người dùng khai báo lệnh cho Power / Shutter,
 * rồi các nút Power / Shutter (kể cả ALL ON / ALL OFF) gửi đúng các lệnh này. Cặp nào để trống thì nút đó chỉ đổi trạng thái trong app.
 */
export function CommandTemplatesPanel({ projector: p }: { projector: Projector }) {
  const { updateProjector } = useProjectActions()
  const type = p.network.protocol.type
  const saved = p.network.protocol.commands ?? {}
  const [draft, setDraft] = useState<CommandTemplates>(saved)
  if (!TEMPLATE_PROTOCOLS.includes(type)) return null

  const dirty = TEMPLATE_KEYS.some(k => (draft[k] ?? '') !== (saved[k] ?? ''))
  const incomplete = (a: keyof CommandTemplates, b: keyof CommandTemplates) => !!draft[a]?.trim() !== !!draft[b]?.trim()

  function save() {
    const commands: CommandTemplates = {}
    for (const k of TEMPLATE_KEYS) if (draft[k]?.trim()) commands[k] = draft[k]
    updateProjector(p.id, {
      network: { ...p.network, protocol: { ...p.network.protocol, commands } },
      log: appendLog(p, 'info', `Command templates saved (${Object.keys(commands).length} set)`),
    })
  }

  return (
    <>
      <SectionHeader label="COMMANDS" />
      <div className="mb-5 flex flex-col gap-2.5">
        <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
          This protocol has no standard commands. Power and Shutter buttons send what you enter here. {SYNTAX[type]}
        </p>
        {TEMPLATE_KEYS.map(k => (
          <Field key={k} label={LABEL[k]}>
            {id => <TextInput id={id} value={draft[k] ?? ''} placeholder={EXAMPLE[type]?.[k] ?? ''} autoComplete="off" spellCheck={false}
              onChange={e => setDraft({ ...draft, [k]: e.target.value })} className="px-2 py-1.5 text-xs" />}
          </Field>
        ))}
        {(incomplete('powerOn', 'powerOff') || incomplete('shutterClose', 'shutterOpen')) && (
          <p className="font-mono text-[10px] text-warn">Fill both commands of a pair (ON and OFF, CLOSE and OPEN) to enable that button.</p>
        )}
        <Button variant="primary" disabled={!dirty} onClick={save}>SAVE COMMANDS</Button>
      </div>
    </>
  )
}

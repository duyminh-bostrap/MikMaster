import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, SelectInput, TextInput } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { PROTOCOL_OPTIONS } from '@/constants/protocols'
import type { ProtocolType } from '@/types'

export function ManualAddForm({ onAdd }: { onAdd: (ip: string, name: string, protocol: ProtocolType) => string | null }) {
  const [ip, setIp] = useState('')
  const [name, setName] = useState('')
  const [protocol, setProtocol] = useState<ProtocolType>('pjlink-class2')
  const [error, setError] = useState('')

  function submit() {
    const result = onAdd(ip, name, protocol)
    setError(result ?? '')
    if (!result) { setIp(''); setName('') }
  }
  const onEnter = (e: React.KeyboardEvent) => e.key === 'Enter' && submit()

  return (
    <Panel title="MANUAL ADD" bodyClassName="flex flex-col gap-3">
      <p className="text-xs leading-relaxed text-muted-foreground">Add a device not detected by scan (different subnet or ping-blocked).</p>
      <Field label="IP ADDRESS">{id => <TextInput id={id} value={ip} invalid={!!error} placeholder="192.168.1.100" onChange={e => { setIp(e.target.value); setError('') }} onKeyDown={onEnter} />}</Field>
      <Field label="DISPLAY NAME (opt.)">{id => <TextInput id={id} value={name} placeholder="e.g. Backup Unit" onChange={e => setName(e.target.value)} onKeyDown={onEnter} />}</Field>
      <Field label="PROTOCOL">
        {id => (
          <SelectInput id={id} value={protocol} onChange={e => setProtocol(e.target.value as ProtocolType)}>
            {PROTOCOL_OPTIONS.map(o => <option key={o.type} value={o.type}>{o.label} · {o.defaultPort}</option>)}
          </SelectInput>
        )}
      </Field>
      {error && <p role="alert" className="font-mono text-xs text-danger">{error}</p>}
      <Button size="md" onClick={submit}><Plus size={12} strokeWidth={2.5} />ADD DEVICE</Button>
    </Panel>
  )
}

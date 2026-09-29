import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, SelectInput, TextInput } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { MODEL_PRESETS } from '@/constants/models'
import { PROTOCOL_OPTIONS } from '@/constants/protocols'
import type { ProtocolType } from '@/types'
import type { ManualDeviceInput } from './useNewProjectDraft'
import { t } from '@/i18n'

export function ManualAddForm({ onAdd }: { onAdd: (input: ManualDeviceInput) => string | null }) {
  const [ip, setIp] = useState('')
  const [name, setName] = useState('')
  const [preset, setPreset] = useState('')
  const [protocol, setProtocol] = useState<ProtocolType>('pjlink-class2')
  const [error, setError] = useState('')

  const model = MODEL_PRESETS.find(m => m.id === preset)

  function choosePreset(id: string) {
    setPreset(id)
    const m = MODEL_PRESETS.find(x => x.id === id)
    if (m) setProtocol(m.protocol)
  }

  function submit() {
    const result = onAdd({ ip, name, protocol, model: model?.label })
    setError(result ?? '')
    if (!result) { setIp(''); setName('') }
  }
  const onEnter = (e: React.KeyboardEvent) => e.key === 'Enter' && submit()

  return (
    <Panel title={t('MANUAL ADD')} bodyClassName="flex flex-col gap-3">
      <p className="text-xs leading-relaxed text-muted-foreground">Add a device not detected by scan (different subnet or ping-blocked).</p>
      <Field label={t('MODEL')}>
        {id => (
          <SelectInput id={id} value={preset} onChange={e => choosePreset(e.target.value)}>
            <option value="">{t('Other / generic')}</option>
            {MODEL_PRESETS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </SelectInput>
        )}
      </Field>
      <Field label={t('IP ADDRESS')}>{id => <TextInput id={id} value={ip} invalid={!!error} placeholder="192.168.1.100" onChange={e => { setIp(e.target.value); setError('') }} onKeyDown={onEnter} />}</Field>
      <Field label={t('DISPLAY NAME (opt.)')}>{id => <TextInput id={id} value={name} placeholder={t('e.g. Backup Unit')} onChange={e => setName(e.target.value)} onKeyDown={onEnter} />}</Field>
      <Field label={t('PROTOCOL')}>
        {id => (
          <SelectInput id={id} value={protocol} onChange={e => setProtocol(e.target.value as ProtocolType)}>
            {PROTOCOL_OPTIONS.map(o => <option key={o.type} value={o.type}>{o.label} · {o.defaultPort}</option>)}
          </SelectInput>
        )}
      </Field>
      {error && <p role="alert" className="font-mono text-xs text-danger">{error}</p>}
      <Button size="md" onClick={submit}><Plus size={12} strokeWidth={2.5} />{t('ADD DEVICE')}</Button>
    </Panel>
  )
}

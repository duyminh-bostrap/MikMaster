import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, SelectInput, TextInput } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { MODEL_PRESETS } from '@/constants/models'
import { PROTOCOL_OPTIONS } from '@/constants/protocols'
import type { ProtocolType } from '@/types'
import type { ManualDeviceInput } from './useNewProjectDraft'
import { t } from '@/i18n'
import { IdentifyStatus } from '@/features/identify/IdentifyStatus'
import { modelLabel, suggestName, useIdentify } from '@/features/identify/useIdentify'

export function ManualAddForm({ onAdd, takenNames = [] }: { onAdd: (input: ManualDeviceInput) => string | null; takenNames?: readonly string[] }) {
  const [ip, setIp] = useState('')
  const [name, setName] = useState('')
  const [preset, setPreset] = useState('')
  const [protocol, setProtocol] = useState<ProtocolType>('pjlink-class2')
  const [error, setError] = useState('')

  const model = MODEL_PRESETS.find(m => m.id === preset)
  // Nhập IP → tự nhận diện: điền sẵn giao thức, model, tên (ô đã sửa tay thì giữ nguyên).
  const [detectedModel, setDetectedModel] = useState('')
  const touched = useRef({ name: false, protocol: false })
  const identify = useIdentify(ip)
  useEffect(() => {
    if (identify.status !== 'found') return
    const r = identify.result
    if (!touched.current.protocol && r.protocol) setProtocol(r.protocol)
    setDetectedModel(modelLabel(r))
    if (!touched.current.name) setName(suggestName(r, takenNames))
  }, [identify, takenNames])

  function choosePreset(id: string) {
    touched.current.protocol = true
    setPreset(id)
    const m = MODEL_PRESETS.find(x => x.id === id)
    if (m) setProtocol(m.protocol)
  }

  function submit() {
    const result = onAdd({ ip, name, protocol, model: model?.label ?? (detectedModel || undefined) })
    setError(result ?? '')
    if (!result) { setIp(''); setName(''); setDetectedModel(''); touched.current = { name: false, protocol: false } }
  }
  const onEnter = (e: React.KeyboardEvent) => e.key === 'Enter' && submit()

  return (
    <Panel title={t('MANUAL ADD')} bodyClassName="flex flex-col gap-3">
      <p className="text-xs leading-relaxed text-muted-foreground">{t('Add a device not detected by scan (different subnet or ping-blocked).')}</p>
      <Field label={t('MODEL')}>
        {id => (
          <SelectInput id={id} value={preset} onChange={e => choosePreset(e.target.value)}>
            <option value="">{t('Other / generic')}</option>
            {MODEL_PRESETS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </SelectInput>
        )}
      </Field>
      <Field label={t('IP ADDRESS')}>{id => <TextInput id={id} value={ip} invalid={!!error} placeholder="192.168.1.100" onChange={e => { setIp(e.target.value); setError('') }} onKeyDown={onEnter} />}</Field>
      <div className="-mt-2"><IdentifyStatus state={identify} /></div>
      <Field label={t('DISPLAY NAME (opt.)')}>{id => <TextInput id={id} value={name} placeholder={t('e.g. Backup Unit')} onChange={e => { touched.current.name = true; setName(e.target.value) }} onKeyDown={onEnter} />}</Field>
      <Field label={t('PROTOCOL')}>
        {id => (
          <SelectInput id={id} value={protocol} onChange={e => { touched.current.protocol = true; setProtocol(e.target.value as ProtocolType) }}>
            {PROTOCOL_OPTIONS.map(o => <option key={o.type} value={o.type}>{o.label}</option>)}
          </SelectInput>
        )}
      </Field>
      {error && <p role="alert" className="font-mono text-xs text-danger">{error}</p>}
      <Button size="md" onClick={submit}><Plus size={12} strokeWidth={2.5} />{t('ADD DEVICE')}</Button>
    </Panel>
  )
}

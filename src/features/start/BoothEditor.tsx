import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import type { Booth } from '@/types'
import { t } from '@/i18n'

export function BoothEditor({ booths, onAdd, onRemove }: { booths: Booth[]; onAdd: (name: string) => void; onRemove: (id: string) => void }) {
  const [name, setName] = useState('')
  function submit() { onAdd(name); setName('') }

  return (
    <Panel title={t('GROUPS')} aside={<span className="font-mono text-xs text-muted-foreground">{booths.length}</span>} bodyClassName="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {booths.map(b => (
          <li key={b.id} className="flex items-center justify-between rounded-sm border border-border bg-muted px-3 py-1.5">
            <span className="text-xs text-foreground">{b.name}</span>
            <button type="button" aria-label={`Remove ${b.name}`} disabled={booths.length <= 1} onClick={() => onRemove(b.id)} className="text-muted-foreground hover:text-danger disabled:opacity-30">
              <X size={12} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1.5">
        <TextInput aria-label={t('New group name')} value={name} placeholder={t('New group…')} className="px-2 py-1.5 text-xs" onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }} />
        <Button aria-label={t('Add group')} disabled={!name.trim()} onClick={submit}><Plus size={12} /></Button>
      </div>
    </Panel>
  )
}

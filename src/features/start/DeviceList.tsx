import { Checkbox } from '@/components/ui/Checkbox'
import { Badge } from '@/components/ui/Badge'
import { Panel } from '@/components/ui/Panel'
import { SelectInput } from '@/components/ui/Field'
import { PROTOCOL_OPTIONS } from '@/constants/protocols'
import { cn } from '@/utils/cn'
import type { Booth, ProtocolType } from '@/types'
import type { DraftDevice } from './useNewProjectDraft'
import { t } from '@/i18n'

/** Danh sách thiết bị tìm thấy: chọn, đổi Protocol và phân bổ Booth cho từng máy. */
export function DeviceList({ devices, booths, onSelect, onBooth, onProtocol }: {
  devices: DraftDevice[]
  booths: Booth[]
  onSelect: (ip: string, selected: boolean) => void
  onBooth: (ip: string, boothId: string) => void
  onProtocol: (ip: string, type: ProtocolType) => void
}) {
  const selected = devices.filter(d => d.selected).length
  return (
    <Panel title={t('DISCOVERED DEVICES')} aside={<span className="font-mono text-xs text-accent">{selected}/{devices.length} {t('SELECTED')}</span>} bodyClassName="p-0">
      {devices.map(({ projector: p, selected: isSelected, source, authRequired }, i) => (
        <div key={`${p.network.ip}:${p.network.protocol.type}`} className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3', i > 0 && 'border-t border-border', isSelected && 'bg-primary/[0.04]')}>
          <Checkbox checked={isSelected} onChange={c => onSelect(p.network.ip, c)} label={`Select ${p.name}`} />
          <div className="min-w-44 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">{p.name}</span>
              {source === 'manual' && <Badge tone="accent">{t('MANUAL')}</Badge>}
              {authRequired && <Badge tone="warn">{t('LOGIN')}</Badge>}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-mono text-accent">{p.network.ip}</span>
              <span className="truncate text-muted-foreground">{p.model}</span>
            </div>
          </div>
          <div className="w-44"><SelectInput aria-label={`Protocol for ${p.name}`} value={p.network.protocol.type} onChange={e => onProtocol(p.network.ip, e.target.value as ProtocolType)} className="px-2 py-1.5 text-xs">
            {PROTOCOL_OPTIONS.map(o => <option key={o.type} value={o.type}>{o.label}</option>)}
          </SelectInput></div>
          <div className="w-36"><SelectInput aria-label={`Booth for ${p.name}`} value={p.boothId} onChange={e => onBooth(p.network.ip, e.target.value)} className="px-2 py-1.5 text-xs">
            {booths.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </SelectInput></div>
        </div>
      ))}
    </Panel>
  )
}

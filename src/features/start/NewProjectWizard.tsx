import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { getProtocolOption } from '@/constants/protocols'
import type { ProjectSnapshot } from '@/services/projectRepository'
import { BoothEditor } from './BoothEditor'
import { DeviceList } from './DeviceList'
import { StepHeader } from './LoadProjectList'
import { ManualAddForm } from './ManualAddForm'
import { ScanPanel } from './ScanPanel'
import { useNetworkScan } from './useNetworkScan'
import { useNewProjectDraft } from './useNewProjectDraft'

const SUBNET = '192.168.10'

export function NewProjectWizard({ onBack, onLaunch }: { onBack: () => void; onLaunch: (snapshot: ProjectSnapshot) => void }) {
  const draft = useNewProjectDraft()
  const scan = useNetworkScan(SUBNET, draft.addDiscovered)
  const { start: startScan } = scan
  const { clearScanned } = draft

  const rescan = () => { clearScanned(); startScan() }

  const ready = draft.selectedCount > 0

  return (
    <div className="w-full max-w-6xl">
      <StepHeader title="New Project" onBack={onBack}
        aside={draft.devices.length > 0 ? <Badge tone="accent">{draft.devices.length} found · {draft.selectedCount} selected</Badge> : undefined} />

      <div className="grid grid-cols-[1fr_320px] gap-5 max-lg:grid-cols-1">
        <div className="flex flex-col gap-4">
          <Panel title="PROJECT DETAILS" bodyClassName="grid grid-cols-2 gap-3">
            <Field label="PROJECT NAME">{id => <TextInput id={id} value={draft.name} placeholder="e.g. Grand Tech Summit 2026" onChange={e => draft.setName(e.target.value)} />}</Field>
            <Field label="VENUE">{id => <TextInput id={id} value={draft.venue} placeholder="e.g. Hanoi Convention Centre" onChange={e => draft.setVenue(e.target.value)} />}</Field>
          </Panel>

          <ScanPanel subnet={SUBNET} status={scan.status} progress={scan.progress} currentIp={scan.currentIp} onStart={scan.status === 'done' ? rescan : startScan} />

          {draft.devices.length > 0 && (
            <DeviceList devices={draft.devices} booths={draft.booths} onSelect={draft.setSelected} onBooth={draft.setBoothOf} onProtocol={draft.setProtocolOf} />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <BoothEditor booths={draft.booths} onAdd={draft.addBooth} onRemove={draft.removeBooth} />
          <ManualAddForm onAdd={draft.addManual} />

          <div className="rounded-sm border border-border bg-muted p-4">
            <p className="mb-2 font-mono text-xs tracking-[0.08em] text-accent">DEFAULT PORTS</p>
            {(['pjlink-class2', 'christie-serial-ip', 'barco-xlm', 'sony-sdcp'] as const).map(t => {
              const o = getProtocolOption(t)
              return (
                <div key={t} className="flex justify-between py-0.5 font-mono text-xs">
                  <span className="text-muted-foreground">{o.label}</span>
                  <span className="text-foreground">{o.defaultPort}</span>
                </div>
              )
            })}
          </div>

          <Button size="md" variant="primary" disabled={!ready} className="py-3 text-sm font-semibold tracking-[0.04em]" onClick={() => onLaunch(draft.buildLaunchPayload())}>
            {ready ? `LAUNCH — ${draft.selectedCount} DEVICE${draft.selectedCount > 1 ? 'S' : ''}` : 'SELECT DEVICES FIRST'}
            {ready && <ArrowRight size={14} strokeWidth={2.5} />}
          </Button>
        </div>
      </div>
    </div>
  )
}

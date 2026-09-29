import { ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { saveDeviceCredentials, saveSharedCredentials } from '@/services/credentialCache'
import type { ProjectSnapshot } from '@/services/projectRepository'
import { cn } from '@/utils/cn'
import { lacksPassword, type Credentials } from '@/utils/credentials'
import { BoothEditor } from './BoothEditor'
import { DeviceList } from './DeviceList'
import { LaunchPanel } from './LaunchPanel'
import { StepHeader } from './LoadProjectList'
import { ManualAddForm } from './ManualAddForm'
import { ScanPanel } from './ScanPanel'
import { useNetworkScan } from './useNetworkScan'
import { useNewProjectDraft } from './useNewProjectDraft'

const DEFAULT_RANGE = { from: '192.168.1.1', to: '192.168.1.254' }
const STEPS = ['PROJECT', 'SCAN'] as const
type Step = 0 | 1

function Stepper({ step, onGo }: { step: Step; onGo: (s: Step) => void }) {
  return (
    <ol className="mb-6 flex items-center gap-2 font-mono text-xs">
      {STEPS.map((label, i) => {
        const done = i < step
        return (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span className={cn('h-px w-8', done || i === step ? 'bg-primary/60' : 'bg-border')} />}
            <button type="button" disabled={i > step} onClick={() => onGo(i as Step)} aria-current={i === step ? 'step' : undefined}
              className={cn('flex items-center gap-2 tracking-[0.08em] transition-colors disabled:cursor-default',
                i === step ? 'text-primary' : done ? 'text-foreground hover:text-primary' : 'text-muted-foreground')}>
              <span className={cn('flex size-5 items-center justify-center rounded-full border text-[10px]',
                i === step ? 'border-primary bg-primary text-primary-foreground' : done ? 'border-primary/60 text-primary' : 'border-border')}>
                {done ? <Check size={10} strokeWidth={3} /> : i + 1}
              </span>
              {label}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/** Tạo project theo 2 bước: tên + Booth (tuỳ chọn) → quét máy rồi LAUNCH / LOGIN & LAUNCH. */
export function NewProjectWizard({ onBack, onLaunch }: { onBack: () => void; onLaunch: (snapshot: ProjectSnapshot) => void }) {
  const draft = useNewProjectDraft()
  const [step, setStep] = useState<Step>(0)
  const [range, setRange] = useState(DEFAULT_RANGE)
  const scan = useNetworkScan(range, draft.addDiscovered)
  const { start: startScan } = scan
  const { clearScanned } = draft

  const rescan = () => { clearScanned(); startScan() }
  const next = () => {
    setStep(1)
    // Vào bước quét là quét luôn — bớt một cú bấm.
    if (scan.status === 'idle') startScan()
  }
  const back = () => (step === 0 ? onBack() : setStep(0))

  const loginTargets = draft.devices.filter(d => d.selected && lacksPassword(d.projector)).length

  function launch(login?: Credentials) {
    const payload = draft.buildLaunchPayload(login)
    // Ghi cache để mở lại project trong phiên này không phải nhập lại.
    if (login) saveSharedCredentials(login)
    for (const p of payload.projectors) {
      const { username, password, port } = p.network.protocol
      if (username || password) saveDeviceCredentials(p.network.ip, port, { username, password })
    }
    onLaunch(payload)
  }

  return (
    <div className={cn('w-full', step === 1 ? 'max-w-6xl' : 'max-w-xl')}>
      <StepHeader title="New Project" onBack={back}
        aside={step === 1 && draft.devices.length > 0 ? <Badge tone="accent">{draft.devices.length} found · {draft.selectedCount} selected</Badge> : undefined} />
      <Stepper step={step} onGo={setStep} />

      {step === 0 && (
        <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); next() }}>
          <Panel title="PROJECT" bodyClassName="flex flex-col gap-3">
            <Field label="PROJECT NAME">{id => <TextInput id={id} autoFocus value={draft.name} placeholder="e.g. Grand Tech Summit 2026" onChange={e => draft.setName(e.target.value)} />}</Field>
          </Panel>
          <BoothEditor booths={draft.booths} onAdd={draft.addBooth} onRemove={draft.removeBooth} />
          <p className="-mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">Booths are optional — every device starts in the first booth, and you can rename or move devices later on the dashboard.</p>
          <Button type="submit" size="md" variant="primary" className="self-end px-6">NEXT: SCAN<ArrowRight size={13} strokeWidth={2.5} /></Button>
        </form>
      )}

      {step === 1 && (
        <div className="grid grid-cols-[1fr_320px] gap-5 max-lg:grid-cols-1">
          <div className="flex flex-col gap-4">
            <ScanPanel range={range} onRangeChange={setRange} status={scan.status} progress={scan.progress} currentIp={scan.currentIp} error={scan.error} foundIps={draft.devices.map(d => d.projector.network.ip)} onStart={scan.status === 'done' ? rescan : startScan} />
            {draft.devices.length > 0 && (
              <DeviceList devices={draft.devices} booths={draft.booths} onSelect={draft.setSelected} onBooth={draft.setBoothOf} onProtocol={draft.setProtocolOf} />
            )}
          </div>
          <div className="flex flex-col gap-4">
            {(scan.status === 'done' || draft.devices.length > 0) && (
              <LaunchPanel selected={draft.selectedCount} loginTargets={loginTargets} onLaunch={launch} />
            )}
            <ManualAddForm onAdd={draft.addManual} />
          </div>
        </div>
      )}
    </div>
  )
}

import { Radar, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { TextInput } from '@/components/ui/Field'
import { cn } from '@/utils/cn'
import type { ScanStatus } from './useNetworkScan'

const CELLS = 60

export function ScanPanel({ subnet, onSubnetChange, status, progress, currentIp, error, foundIps, onStart }: {
  subnet: string
  onSubnetChange: (subnet: string) => void
  status: ScanStatus
  progress: number
  currentIp: string
  error: string | null
  foundIps: string[]
  onStart: () => void
}) {
  const subnetValid = /^\d{1,3}(\.\d{1,3}){2}$/.test(subnet)
  const foundOctets = new Set(foundIps.map(ip => Number(ip.split('.')[3])))
  const aside =
    status === 'scanning' ? <span className="animate-status font-mono text-xs text-ok">● SCANNING</span>
    : status === 'done' ? <span className="font-mono text-xs text-ok">✓ COMPLETE</span>
    : null

  return (
    <Panel title={`AUTO SCAN — ${subnet}.1 – ${subnet}.254`} aside={aside}>
      {status === 'idle' ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex size-14 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
            <Radar size={24} strokeWidth={1.5} />
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            Subnet
            <TextInput aria-label="Subnet" value={subnet} invalid={!subnetValid} className="w-32 px-2 py-1 text-xs" onChange={e => onSubnetChange(e.target.value.trim())} />
            <span>.1 – .254</span>
          </div>
          <Button size="md" variant="primary" className="px-5" disabled={!subnetValid} onClick={onStart}><Radar size={12} strokeWidth={2.5} />START NETWORK SCAN</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-1.5 flex justify-between font-mono text-xs">
              <span className="text-muted-foreground">{status === 'scanning' ? `Probing ${currentIp}…` : 'Scan complete'}</span>
              <span className="text-primary">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn('h-full rounded-full transition-all duration-100', status === 'done' ? 'bg-ok' : 'bg-primary')} style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="rounded-sm border border-border bg-muted p-3">
            <div className="flex flex-wrap gap-0.5" aria-hidden>
              {Array.from({ length: CELLS }, (_, i) => {
                const scanned = progress >= Math.round((i / CELLS) * 100)
                const ipNum = Math.round((i / CELLS) * 254)
                const hasDevice = foundOctets.has(ipNum + 1)
                return <div key={i} className={cn('size-2.5 rounded-sm transition-all duration-200', scanned && hasDevice ? 'bg-accent shadow-[0_0_4px_rgb(6_182_212/0.4)]' : scanned ? 'bg-elevated-hover' : 'bg-[#0d1117]')} />
              })}
            </div>
            <p className="mt-2 font-mono text-xs text-muted-foreground"><span className="text-accent">■</span> device found &nbsp; <span className="text-elevated-hover">■</span> scanned</p>
          </div>

          {error && <p role="alert" className="font-mono text-xs text-danger">{error}</p>}
          {status === 'done' && <Button className="self-start" onClick={onStart}><RotateCcw size={11} />RESCAN</Button>}
        </div>
      )}
    </Panel>
  )
}

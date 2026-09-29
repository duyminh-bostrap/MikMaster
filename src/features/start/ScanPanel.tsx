import { Radar, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { MOCK_DISCOVERABLE } from '@/data/mock'
import { cn } from '@/utils/cn'
import type { ScanStatus } from './useNetworkScan'

const CELLS = 60

export function ScanPanel({ subnet, status, progress, currentIp, onStart }: {
  subnet: string
  status: ScanStatus
  progress: number
  currentIp: string
  onStart: () => void
}) {
  const aside =
    status === 'scanning' ? <span className="animate-status font-mono text-xs text-ok">● SCANNING</span>
    : status === 'done' ? <span className="font-mono text-xs text-ok">✓ COMPLETE</span>
    : null

  return (
    <Panel title={`AUTO SCAN — ${subnet}.0/24`} aside={aside}>
      {status === 'idle' ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex size-14 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
            <Radar size={24} strokeWidth={1.5} />
          </div>
          <p className="text-xs text-muted-foreground">Ready — Subnet: {subnet}.1 – {subnet}.254</p>
          <Button size="md" variant="primary" className="px-5" onClick={onStart}><Radar size={12} strokeWidth={2.5} />START NETWORK SCAN</Button>
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
                const hasDevice = MOCK_DISCOVERABLE.some(d => Number(d.ip.split('.')[3]) === ipNum + 1)
                return <div key={i} className={cn('size-2.5 rounded-sm transition-all duration-200', scanned && hasDevice ? 'bg-accent shadow-[0_0_4px_rgb(6_182_212/0.4)]' : scanned ? 'bg-elevated-hover' : 'bg-[#0d1117]')} />
              })}
            </div>
            <p className="mt-2 font-mono text-xs text-muted-foreground"><span className="text-accent">■</span> device found &nbsp; <span className="text-elevated-hover">■</span> scanned</p>
          </div>

          {status === 'done' && <Button className="self-start" onClick={onStart}><RotateCcw size={11} />RESCAN</Button>}
        </div>
      )}
    </Panel>
  )
}

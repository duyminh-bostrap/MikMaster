import { Radar, RotateCcw } from 'lucide-react'
import { checkScanRange, ipToInt } from '../../../shared/ipRange.ts'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { TextInput } from '@/components/ui/Field'
import { cn } from '@/utils/cn'
import type { ScanRange, ScanStatus } from './useNetworkScan'

const CELLS = 60

export function ScanPanel({ range, onRangeChange, status, progress, currentIp, error, foundIps, onStart }: {
  range: ScanRange
  onRangeChange: (range: ScanRange) => void
  status: ScanStatus
  progress: number
  currentIp: string
  error: string | null
  foundIps: string[]
  onStart: () => void
}) {
  const check = checkScanRange(range.from, range.to)
  // Vị trí (0..1) của máy tìm thấy trong dải, để tô ô tương ứng trên lưới.
  const foundPositions = check.ok
    ? foundIps.map(ip => ipToInt(ip)).filter((n): n is number => n !== null && n >= check.from && n <= check.to).map(n => (n - check.from) / Math.max(1, check.count - 1))
    : []
  const aside =
    status === 'scanning' ? <span className="animate-status font-mono text-xs text-ok">● SCANNING</span>
    : status === 'done' ? <span className="font-mono text-xs text-ok">✓ COMPLETE</span>
    : null

  return (
    <Panel title={`AUTO SCAN — ${range.from} – ${range.to}`} aside={aside}>
      {status === 'idle' ? (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex size-14 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
            <Radar size={24} strokeWidth={1.5} />
          </div>
          <RangeInputs range={range} onChange={onRangeChange} />
          <p className={cn('font-mono text-[10px]', check.ok ? 'text-muted-foreground' : 'text-danger')} role={check.ok ? undefined : 'alert'}>
            {check.ok ? `${check.count} address${check.count === 1 ? '' : 'es'}` : check.error}
          </p>
          <Button size="md" variant="primary" className="px-5" disabled={!check.ok} onClick={onStart}><Radar size={12} strokeWidth={2.5} />START NETWORK SCAN</Button>
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
                const hasDevice = foundPositions.some(pos => Math.min(CELLS - 1, Math.floor(pos * CELLS)) === i)
                return <div key={i} className={cn('size-2.5 rounded-sm transition-all duration-200', scanned && hasDevice ? 'bg-accent shadow-[0_0_4px_rgb(6_182_212/0.4)]' : scanned ? 'bg-elevated-hover' : 'bg-[#0d1117]')} />
              })}
            </div>
            <p className="mt-2 font-mono text-xs text-muted-foreground"><span className="text-accent">■</span> device found &nbsp; <span className="text-elevated-hover">■</span> scanned</p>
          </div>

          {error && <p role="alert" className="font-mono text-xs text-danger">{error}</p>}
          {status === 'done' && (
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={onStart} disabled={!check.ok}><RotateCcw size={11} />RESCAN</Button>
              <RangeInputs range={range} onChange={onRangeChange} compact />
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

/** Ô FROM – TO. Sửa địa chỉ đầu khi địa chỉ cuối đang cùng mạng /24 thì kéo theo 3 octet đầu của địa chỉ cuối. */
function RangeInputs({ range, onChange, compact = false }: { range: ScanRange; onChange: (r: ScanRange) => void; compact?: boolean }) {
  const prefix = (ip: string) => ip.split('.').slice(0, 3).join('.')
  function changeFrom(from: string) {
    const oldPrefix = prefix(range.from)
    const follows = prefix(range.to) === oldPrefix && prefix(from) !== oldPrefix && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(from)
    onChange({ from, to: follows ? `${prefix(from)}.${range.to.split('.')[3]}` : range.to })
  }
  const input = cn('px-2 py-1 text-xs', compact ? 'w-28' : 'w-32')
  const check = checkScanRange(range.from, range.to)
  return (
    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
      {!compact && 'From'}
      <TextInput aria-label="Scan from" value={range.from} invalid={ipToInt(range.from) === null} className={input} spellCheck={false}
        onChange={e => changeFrom(e.target.value.trim())} />
      <span>–</span>
      <TextInput aria-label="Scan to" value={range.to} invalid={ipToInt(range.to) === null || (!check.ok && ipToInt(range.from) !== null)} className={input} spellCheck={false}
        onChange={e => onChange({ ...range, to: e.target.value.trim() })} />
    </div>
  )
}

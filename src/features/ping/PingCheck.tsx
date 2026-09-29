import { Activity, Check, Loader2, X } from 'lucide-react'
import type { PingResultDto } from '../../../shared/api.ts'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { formatClock } from '@/utils/format'
import type { Projector } from '@/types'
import { pingVerdict, usePing, VERDICT_TEXT } from './usePing'

function Row({ label, r, na }: { label: string; r: PingResultDto | null; na: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 font-mono text-[10px]">
      <span className="tracking-[0.08em] text-muted-foreground">{label}</span>
      {r === null ? <span className="text-muted-foreground">{na}</span>
        : r.ok ? <span className="flex items-center gap-1 text-ok"><Check size={10} strokeWidth={3} />{r.ms} ms</span>
        : <span className="flex items-center gap-1 text-right text-danger"><X size={10} strokeWidth={3} />{r.error}</span>}
    </div>
  )
}

/** Nút PING + kết quả: máy có trên mạng không (ICMP) và cổng điều khiển có mở không (TCP). */
export function PingCheck({ projector: p, compact = false }: { projector: Projector; compact?: boolean }) {
  const { available, running, result, error, run } = usePing(p)
  const verdict = result && pingVerdict(result)

  return (
    <div className={cn('flex flex-col gap-1.5', !compact && 'rounded-sm border border-border bg-muted/40 p-2.5')}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
          {compact ? 'PING' : `PING ${p.network.ip}`}
        </span>
        <Button size="xs" variant="accent" disabled={!available || running} onClick={() => void run()}
          title={available ? 'Check the IP and the control port' : 'Needs the gateway (pnpm server): browsers cannot ping'}>
          {running ? <Loader2 size={10} className="animate-spin" /> : <Activity size={10} />}
          {running ? 'PINGING…' : result ? 'AGAIN' : 'PING'}
        </Button>
      </div>
      {!available && <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">Needs the gateway (<code>pnpm server</code>) — a browser cannot ping.</p>}
      {error && <p role="alert" className="font-mono text-[10px] text-danger">{error}</p>}
      {result && verdict && (
        <div aria-live="polite" className="flex flex-col gap-1">
          <p className={cn('font-mono text-[10px] font-medium', verdict === 'ok' || verdict === 'no-icmp' ? 'text-ok' : verdict === 'port-closed' ? 'text-warn' : 'text-danger')}>
            {VERDICT_TEXT[verdict]}
          </p>
          <Row label="NETWORK (ICMP)" r={result.icmp} na="not available" />
          <Row label={`PORT ${result.port} (TCP)`} r={result.tcp} na="UDP — not checked" />
          {!compact && <span className="font-mono text-[9px] text-muted-foreground/70">at {formatClock(new Date(result.at))}</span>}
        </div>
      )}
    </div>
  )
}

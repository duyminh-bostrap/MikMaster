import { SectionHeader } from '@/components/ui/SectionHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { formatClock, formatHours } from '@/utils/format'
import { appendLog } from '@/utils/projector'
import { TONE_TEXT, temperatureTone, type Tone } from '@/utils/tones'
import { useProjectActions } from '@/store/hooks'
import type { ConnectionStatus, Projector } from '@/types'

const CONNECTION: Record<ConnectionStatus, { label: string; tone: Tone }> = {
  connected: { label: 'CONNECTED', tone: 'ok' },
  disconnected: { label: 'DISCONNECTED', tone: 'danger' },
  'protocol-error': { label: 'PROTOCOL ERROR', tone: 'danger' },
}

const LEVEL_TONE = { info: 'text-muted-foreground', warn: 'text-warn', error: 'text-danger' } as const

function Row({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-baseline justify-between font-mono">
      <span className="text-[10px] tracking-[0.08em] text-muted-foreground">{label}</span>
      <span className={cn('text-xs text-foreground', valueClassName)}>{value}</span>
    </div>
  )
}

/** Số liệu thiết bị, trạng thái kết nối và log lỗi. */
export function DeviceStatus({ projector: p }: { projector: Projector }) {
  const { updateProjector } = useProjectActions()
  const { temperatureC, lampHours, brightness } = p.telemetry
  const conn = CONNECTION[p.connection]

  // Mô phỏng: khi có backend, thay bằng lời gọi kết nối lại thật.
  function reconnect() {
    updateProjector(p.id, { connection: 'connected', errors: p.errors.filter(e => e !== 'Offline'), log: appendLog(p, 'info', 'Reconnected') })
  }

  return (
    <>
      <SectionHeader label="STATUS" />
      <div className="mb-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Badge tone={conn.tone}>{conn.label}</Badge>
          {p.connection !== 'connected' && <Button size="xs" variant="accent" onClick={reconnect}>RECONNECT</Button>}
        </div>
        <Row label="MODEL" value={p.model} />
        <Row label="LAMP HOURS" value={formatHours(lampHours)} />
        <Row label="BRIGHTNESS" value={`${brightness}%`} />
        <Row label="TEMPERATURE" value={temperatureC > 0 ? `${temperatureC}°C` : '—'} valueClassName={TONE_TEXT[temperatureTone(temperatureC)]} />
      </div>

      <SectionHeader label="EVENT LOG" />
      {p.log.length === 0 ? (
        <p className="font-mono text-[10px] text-muted-foreground">No events</p>
      ) : (
        <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
          {p.log.map(e => (
            <li key={e.id} className="font-mono text-[10px] leading-snug">
              <span className="text-muted-foreground">{formatClock(new Date(e.at))} </span>
              <span className={LEVEL_TONE[e.level]}>{e.message}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

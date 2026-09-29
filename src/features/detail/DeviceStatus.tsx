import { useState } from 'react'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { formatClock, formatHours } from '@/utils/format'
import { appendLog } from '@/utils/projector'
import { TONE_TEXT, temperatureTone, type Tone } from '@/utils/tones'
import { useProjectActions } from '@/store/hooks'
import { useGateway } from '@/store/useGateway'
import { PingCheck } from '@/features/ping/PingCheck'
import type { ConnectionStatus, Projector } from '@/types'
import { t } from '@/i18n'

const CONNECTION: Record<ConnectionStatus, { label: string; tone: Tone }> = {
  connected: { label: 'CONNECTED', tone: 'ok' },
  disconnected: { label: 'DISCONNECTED', tone: 'danger' },
  'protocol-error': { label: 'PROTOCOL ERROR', tone: 'danger' },
  'auth-failed': { label: 'LOGIN REQUIRED', tone: 'warn' },
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
  const { updateProjector, syncProjector } = useProjectActions()
  const { gateway } = useGateway()
  const [reconnecting, setReconnecting] = useState(false)
  const { temperatureC, lampHours, brightness, sensors } = p.telemetry
  const conn = CONNECTION[p.connection]

  // LIVE: đọc trạng thái thật ngay (kết quả đi qua cùng đường với vòng poll, kể cả lỗi).
  // Mô phỏng: không có thiết bị để hỏi → chỉ đặt lại trạng thái.
  async function reconnect() {
    if (!gateway) {
      updateProjector(p.id, { connection: 'connected', errors: p.errors.filter(e => e !== 'Offline'), log: appendLog(p, 'info', 'Reconnected (simulated)') })
      return
    }
    setReconnecting(true)
    const r = await gateway.status(p)
    setReconnecting(false)
    syncProjector(p.id, r.ok ? { ok: true, status: r.value } : { ok: false, code: r.code, message: `Reconnect: ${r.message}` })
  }

  return (
    <>
      <SectionHeader label={t('STATUS')} />
      <div className="mb-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Badge tone={conn.tone}>{t(conn.label)}</Badge>
          {p.connection !== 'connected' && <Button size="xs" variant="accent" disabled={reconnecting} onClick={() => void reconnect()}>{reconnecting ? t('CONNECTING…') : t('RECONNECT')}</Button>}
        </div>
        <PingCheck key={`${p.id}:${p.network.ip}:${p.network.protocol.port}`} projector={p} />
        <Row label={t('MODEL')} value={p.model} />
        <Row label={t('LAMP HOURS')} value={lampHours > 0 ? formatHours(lampHours) : '—'} />
        <Row label={t('BRIGHTNESS')} value={`${brightness}%`} />
        <Row label={t('TEMPERATURE')} value={temperatureC > 0 ? `${temperatureC}°C` : '—'} valueClassName={TONE_TEXT[temperatureTone(temperatureC)]} />
        {sensors && sensors.length > 1 && (
          <details className="font-mono text-[10px]">
            <summary className="cursor-pointer text-muted-foreground">{t('All sensors ({n})', { n: sensors.length })}</summary>
            <ul className="mt-1.5 flex flex-col gap-1 pl-2">
              {[...sensors].sort((a, b) => b.c - a.c).map(x => (
                <li key={x.name} className="flex justify-between gap-2">
                  <span className="truncate text-muted-foreground">{x.name}</span>
                  <span className={TONE_TEXT[temperatureTone(x.c)]}>{x.c}°C</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <SectionHeader label={t('EVENT LOG')} />
      {p.log.length === 0 ? (
        <p className="font-mono text-[10px] text-muted-foreground">{t('No events')}</p>
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

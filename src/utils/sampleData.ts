import type { PowerEvent, Sample } from '@/services/telemetryHistory'
import type { LogEntry, Projector } from '@/types'

/*
 * Dữ liệu MẪU cho view Dashboard (nút "dùng dữ liệu mẫu"): để xem biểu đồ và các bảng theo dõi mà không cần máy thật.
 * Hoàn toàn xác định theo id máy (không ngẫu nhiên) nên ổn định giữa các lần vẽ; KHÔNG ghi vào project hay lịch sử thật.
 * Có đủ tình huống: máy bật lúc khác nhau, máy tắt rồi bật lại, máy đã tắt (chờ), máy mất kết nối giữa chừng, máy vượt ngưỡng.
 */

const hash = (s: string): number => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0 }
const MIN = 60_000

type Kind = 'on' | 'restarted' | 'standby' | 'offline'
const kindOf = (i: number): Kind => (i % 7 === 5 ? 'standby' : i % 11 === 9 ? 'offline' : i % 3 === 1 ? 'restarted' : 'on')
const targetOf = (p: Projector, i: number) => (i % 9 === 4 ? 72 : 36 + (hash(p.id) % 27))
const onForOf = (p: Projector) => (8 + (hash(p.id) % 50)) * MIN

/** Các lần bật / tắt mẫu của máy thứ `i`. */
function sampleEvents(p: Projector, i: number, now: number): PowerEvent[] {
  const onFor = onForOf(p)
  switch (kindOf(i)) {
    case 'on': return [{ t: now - onFor, on: true }]
    case 'restarted': return [{ t: now - onFor - 40 * MIN, on: true }, { t: now - onFor - 15 * MIN, on: false }, { t: now - onFor, on: true }]
    case 'standby': return [{ t: now - 75 * MIN, on: true }, { t: now - 20 * MIN, on: false }]
    case 'offline': return [{ t: now - onFor, on: true }, { t: now - 3 * MIN, on: false, lost: true }]
  }
}

/** Đường nóng dần (hàm mũ) từ nhiệt độ phòng tới nhiệt độ làm việc trong một lần bật, mỗi 30 giây. */
function warmCurve(p: Projector, target: number, from: number, to: number): Sample[] {
  const h = hash(p.id)
  const base = 24 + (h % 4)
  const tau = (8 + (h % 9)) * MIN
  const out: Sample[] = []
  for (let t = from; t <= to; t += 30_000) {
    const e = t - from
    const wobble = Math.sin(e / 90_000 + (h % 7)) * 0.6
    out.push({ t, c: Math.round((base + (target - base) * (1 - Math.exp(-e / tau)) + wobble) * 10) / 10 })
  }
  return out
}

export interface SampleSet {
  projectors: Projector[]
  history: Map<string, Sample[]>
  events: Map<string, PowerEvent[]>
}

export function sampleData(ps: Projector[], now: number): SampleSet {
  const history = new Map<string, Sample[]>()
  const events = new Map<string, PowerEvent[]>()
  const projectors = ps.map((p, i) => {
    const h = hash(p.id)
    const kind = kindOf(i)
    const target = targetOf(p, i)
    const ev = sampleEvents(p, i, now)
    events.set(p.id, ev)
    const samples: Sample[] = []
    ev.forEach((e, k) => { if (e.on) samples.push(...warmCurve(p, target, e.t, ev[k + 1]?.t ?? now - 10_000)) })
    history.set(p.id, samples)
    const on = kind === 'on' || kind === 'restarted'
    const at = new Date(now - 60_000).toISOString()
    const log: LogEntry[] = [
      ...ev.map((e, k) => ({ id: `${p.id}-e${k}`, at: new Date(e.t).toISOString(), level: (kind === 'offline' && !e.on ? 'error' : 'info') as LogEntry['level'], message: kind === 'offline' && !e.on ? 'Connection lost (sample)' : e.on ? 'Power on (sample)' : 'Power off (sample)' })).reverse(),
      ...(target >= 70 ? [{ id: `${p.id}-hot`, at, level: 'warn' as const, message: `Temperature ${target}°C above 70°C (sample)` }] : []),
    ]
    const last = samples[samples.length - 1]
    return {
      ...p,
      power: on || kind === 'offline' ? 'on' : 'standby',
      poweredOnAt: on ? ev[ev.length - 1]!.t : undefined,
      connection: kind === 'offline' ? 'disconnected' : 'connected',
      errors: kind === 'offline' ? ['Offline'] : [],
      log,
      telemetry: { ...p.telemetry, temperatureC: on ? (last?.c ? Math.round(last.c) : target) : 0, brightness: on ? 60 + (h % 41) : 0, lampHours: 100 + (h % 3000) },
    } satisfies Projector
  })
  return { projectors, history, events }
}

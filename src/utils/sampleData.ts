import type { Sample } from '@/services/telemetryHistory'
import type { LogEntry, Projector } from '@/types'

/*
 * Dữ liệu MẪU cho view Dashboard (nút "dùng dữ liệu mẫu"): để xem biểu đồ và các bảng theo dõi mà không cần máy thật.
 * Hoàn toàn xác định theo id máy (không ngẫu nhiên) nên ổn định giữa các lần vẽ; KHÔNG ghi vào project hay lịch sử thật.
 */

const hash = (s: string): number => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0 }
const MIN = 60_000

/** Biến thể của một máy: phần lớn đang bật, vài máy chờ / mất kết nối / nóng / lỗi để xem đủ các trạng thái. */
export function sampleProjectors(ps: Projector[], now: number): Projector[] {
  return ps.map((p, i) => {
    const h = hash(p.id)
    const onFor = (6 + (h % 55)) * MIN
    const target = i % 9 === 4 ? 72 : 36 + (h % 27) // một máy vượt ngưỡng nguy hiểm, vài máy qua cảnh báo
    const standby = i % 7 === 5
    const offline = i % 11 === 9
    const at = new Date(now - 60_000).toISOString()
    const log: LogEntry[] = [
      { id: `${p.id}-s1`, at: new Date(now - onFor).toISOString(), level: 'info', message: 'Power on (sample)' },
      ...(target >= 70 ? [{ id: `${p.id}-s2`, at, level: 'warn' as const, message: `Temperature ${target}°C above 70°C (sample)` }] : []),
      ...(offline ? [{ id: `${p.id}-s3`, at, level: 'error' as const, message: 'Connection lost (sample)' }] : []),
    ]
    return {
      ...p,
      power: standby ? 'standby' : 'on',
      poweredOnAt: standby ? undefined : now - onFor,
      connection: offline ? 'disconnected' : 'connected',
      errors: offline ? ['Offline'] : [],
      log,
      telemetry: { ...p.telemetry, temperatureC: standby ? 0 : target, brightness: standby ? 0 : 60 + (h % 41), lampHours: 100 + (h % 3000) },
    }
  })
}

/** Lịch sử nhiệt độ mẫu của một máy mẫu: đường nóng dần (hàm mũ) từ nhiệt độ phòng tới nhiệt độ làm việc, mỗi 30 giây. */
export function sampleHistory(p: Projector, now: number): Sample[] {
  if (p.poweredOnAt === undefined || p.telemetry.temperatureC <= 0) return []
  const h = hash(p.id)
  const base = 24 + (h % 4)
  const target = p.telemetry.temperatureC
  const tau = (8 + (h % 9)) * MIN
  const out: Sample[] = []
  for (let t = p.poweredOnAt; t <= now - 10_000; t += 30_000) {
    const e = t - p.poweredOnAt
    const wobble = Math.sin(e / 90_000 + (h % 7)) * 0.6
    out.push({ t, c: Math.round((base + (target - base) * (1 - Math.exp(-e / tau)) + wobble) * 10) / 10 })
  }
  return out
}

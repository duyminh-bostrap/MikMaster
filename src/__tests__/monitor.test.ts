import { describe, expect, test } from 'vitest'
import { distToSegment, niceStepMs } from '@/components/charts/LineChart'
import { activeErrors, brightnessRows, logRows, monitorStatus, onTimeRows, statusRows, temperatureRows, timeline, GAP_MS } from '@/utils/monitor'
import { createProjector } from '@/utils/projector'
import type { Projector } from '@/types'

const proj = (id: string, patch: Partial<Projector> = {}): Projector => ({ ...createProjector({ id, boothId: 'b', name: id, ip: '10.0.0.1' }), ...patch })
const tel = (temperatureC: number, brightness = 0) => ({ temperatureC, lampHours: 0, brightness })
const log = (id: string, at: string, level: 'info' | 'warn' | 'error', message = id) => ({ id, at, level, message })

describe('monitorStatus', () => {
  test('cần đăng nhập > mất kết nối > lỗi > bật > chờ > tắt', () => {
    expect(monitorStatus(proj('a', { connection: 'auth-failed', power: 'on' })).key).toBe('login')
    expect(monitorStatus(proj('a', { connection: 'disconnected', power: 'on' })).key).toBe('offline')
    expect(monitorStatus(proj('a', { errors: ['Lamp'], power: 'on' })).key).toBe('error')
    expect(monitorStatus(proj('a', { power: 'on' })).key).toBe('on')
    expect(monitorStatus(proj('a', { power: 'standby' })).key).toBe('standby')
    expect(monitorStatus(proj('a', { power: 'off' })).key).toBe('off')
  })
})

describe('bảng nhiệt độ / độ sáng', () => {
  test('nhiệt độ: nóng nhất trước; máy không báo nhiệt độ chỉ được đếm', () => {
    const r = temperatureRows([proj('a', { telemetry: tel(40) }), proj('b', { telemetry: tel(70) }), proj('c', { telemetry: tel(0) })])
    expect(r.rows.map(p => p.id)).toEqual(['b', 'a'])
    expect([r.missing, r.avg, r.max]).toEqual([1, 55, 70])
    expect(temperatureRows([])).toEqual({ rows: [], missing: 0, avg: 0, max: 0 })
  })

  test('độ sáng: mọi máy đang kết nối báo được độ sáng (kể cả đang chờ), sáng nhất trước; máy không báo / mất kết nối chỉ được đếm', () => {
    const r = brightnessRows([
      proj('a', { power: 'on', telemetry: tel(0, 50) }), proj('b', { power: 'on', telemetry: tel(0, 90) }),
      proj('c', { power: 'standby', telemetry: tel(0, 100) }), proj('d', { power: 'off', telemetry: tel(0, 0) }),
      proj('e', { power: 'on', connection: 'disconnected', telemetry: tel(0, 80) }),
    ])
    expect(r.rows.map(p => p.id)).toEqual(['c', 'b', 'a'])
    expect([r.off, r.avg]).toEqual([2, 80])
  })
})

describe('thời gian từ lúc bật', () => {
  test('tính từ poweredOnAt, lâu nhất trước; máy tắt / chưa có mốc không có hàng', () => {
    const now = 10_000_000
    const r = onTimeRows([
      proj('a', { power: 'on', poweredOnAt: now - 60_000 }),
      proj('b', { power: 'on', poweredOnAt: now - 3_600_000 }),
      proj('c', { power: 'standby', poweredOnAt: now - 9_000_000 }),
      proj('d', { power: 'on' }),
    ], now)
    expect(r.rows.map(x => [x.projector.id, x.ms])).toEqual([['b', 3_600_000], ['a', 60_000]])
    expect([r.off, r.longest]).toEqual([2, 3_600_000])
  })
})

describe('trạng thái và nhật ký', () => {
  test('statusRows: máy cần chú ý lên đầu; đếm theo trạng thái', () => {
    const r = statusRows([proj('on', { power: 'on' }), proj('off', { power: 'off' }), proj('bad', { connection: 'disconnected' }), proj('login', { connection: 'auth-failed' })])
    expect(r.rows.map(p => p.id)).toEqual(['login', 'bad', 'on', 'off'])
    expect(r.counts).toMatchObject({ login: 1, offline: 1, on: 1, off: 1, error: 0, standby: 0 })
  })

  test('logRows: gộp mọi máy, mới nhất trước, lọc theo mức, có giới hạn', () => {
    const ps = [
      proj('a', { log: [log('1', '2026-01-01T10:00:00', 'info'), log('2', '2026-01-01T12:00:00', 'error')] }),
      proj('b', { log: [log('3', '2026-01-01T11:00:00', 'warn')] }),
    ]
    expect(logRows(ps, 'all').map(r => r.entry.id)).toEqual(['2', '3', '1'])
    expect(logRows(ps, 'issues').map(r => r.entry.id)).toEqual(['2', '3'])
    expect(logRows(ps, 'errors').map(r => r.entry.id)).toEqual(['2'])
    expect(logRows(ps, 'all', 2)).toHaveLength(2)
  })

  test('activeErrors: chỉ máy đang có lỗi', () => {
    expect(activeErrors([proj('a'), proj('b', { errors: ['Lamp', 'Fan'] })]).map(e => [e.projector.id, e.errors])).toEqual([['b', ['Lamp', 'Fan']]])
  })
})

describe('timeline (bật / tắt + nhiệt độ lúc bật, gốc = máy đầu tiên bật)', () => {
  const now = 10_000_000
  test('chưa máy nào từng bật → null', () => {
    expect(timeline([proj('a')], () => [], () => [], now)).toBeNull()
  })

  test('đường nối liền kể cả lúc máy tắt (y = null → đáy trục); chỉ đứt khi mất kết nối; gốc = lần bật sớm nhất', () => {
    const a = proj('a', { power: 'on', poweredOnAt: now - 1000, telemetry: tel(50) })
    const b = proj('b', { power: 'standby' })
    const ev: Record<string, { t: number; on: boolean; lost?: boolean }[]> = {
      a: [{ t: now - 5000, on: true }, { t: now - 3000, on: false }, { t: now - 1000, on: true }],
      b: [{ t: now - 6000, on: true }, { t: now - 4000, on: false, lost: true }],
    }
    const hist: Record<string, { t: number; c: number; off?: true }[]> = {
      a: [{ t: now - 4500, c: 30 }, { t: now - 3500, c: 35 }, { t: now - 2500, c: 0, off: true }, { t: now - 500, c: 40 }],
      b: [{ t: now - 5000, c: 33 }, { t: now - 4500, c: 36 }],
    }
    const tl = timeline([a, b], id => hist[id] ?? [], id => ev[id] ?? [], now)!
    expect(tl.origin).toBe(now - 6000)
    const sa = tl.series.find(x => x.projector.id === 'a')!
    // một đoạn liền: bật → tắt (null) → bật; thêm điểm "bây giờ" 50°C
    expect(sa.segments).toEqual([[{ x: 1500, y: 30 }, { x: 2500, y: 35 }, { x: 3500, y: null }, { x: 5500, y: 40 }, { x: 6000, y: 50 }]])
    expect(sa.events).toEqual([{ x: 1000, on: true }, { x: 3000, on: false }, { x: 5000, on: true }])
    // máy b đang chờ (kết nối) → có điểm "bây giờ" ở đáy; sự kiện mất kết nối được đánh dấu
    const sb = tl.series.find(x => x.projector.id === 'b')!
    expect(sb.segments[0]!.slice(0, 2)).toEqual([{ x: 1000, y: 33 }, { x: 1500, y: 36 }])
    expect(sb.events[1]).toEqual({ x: 2000, on: false, lost: true })
  })

  test('máy đang tắt / chờ mà vẫn báo nhiệt độ → vẽ nhiệt độ thật, không rơi xuống đáy', () => {
    const now2 = 5_000_000
    const standby = proj('a', { power: 'standby', telemetry: tel(31) })
    const tl = timeline([standby], () => [{ t: now2 - 4000, c: 33 }], () => [{ t: now2 - 4000, on: true }, { t: now2 - 2000, on: false }], now2)!
    expect(tl.series[0]!.segments).toEqual([[{ x: 0, y: 33 }, { x: 4000, y: 31 }]])
  })

  test('mất kết nối (không có mẫu quá GAP_MS) → đường đứt thành hai đoạn; máy mất kết nối không có điểm "bây giờ"', () => {
    const lost = proj('a', { power: 'on', connection: 'disconnected', telemetry: tel(50) })
    const t0 = 1_000_000
    const hist = [{ t: t0, c: 30 }, { t: t0 + 4000, c: 31 }, { t: t0 + 4000 + GAP_MS + 1000, c: 29 }]
    const tl = timeline([lost], () => hist, () => [{ t: t0, on: true }], t0 + 10 * GAP_MS)!
    expect(tl.series[0]!.segments.map(sg => sg.length)).toEqual([2, 1])
    expect(tl.end).toBe(t0 + 4000 + GAP_MS + 1000) // không có điểm "bây giờ" khi mất kết nối
  })
})

describe('biểu đồ: trỏ chuột vào đường', () => {
  test('distToSegment: khoảng cách tới đoạn thẳng, tới đầu mút, và tới điểm (đoạn suy biến)', () => {
    expect(distToSegment(5, 3, 0, 0, 10, 0)).toBe(3) // thẳng góc với đoạn
    expect(distToSegment(-4, 3, 0, 0, 10, 0)).toBe(5) // gần đầu mút trái
    expect(distToSegment(13, 4, 0, 0, 10, 0)).toBe(5) // gần đầu mút phải
    expect(distToSegment(3, 4, 0, 0, 0, 0)).toBe(5) // một điểm
  })

  test('niceStepMs: không quá ~6 vạch trên trục ngang', () => {
    expect(niceStepMs(2 * 60_000)).toBe(60_000)
    expect(niceStepMs(60 * 60_000)).toBe(10 * 60_000)
    expect(niceStepMs(100 * 60_000)).toBe(30 * 60_000)
  })
})

describe('thang nhiệt độ', () => {
  test('trên 33°C cảnh báo, trên 40°C nguy hiểm', async () => {
    const { temperatureTone } = await import('@/utils/tones')
    expect([25, 33, 34, 40, 41].map(temperatureTone)).toEqual(['ok', 'ok', 'warn', 'warn', 'danger'])
  })
})

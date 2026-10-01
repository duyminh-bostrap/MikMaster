import { describe, expect, test } from 'vitest'
import { distToSegment, niceStepMs } from '@/components/charts/LineChart'
import { activeErrors, brightnessRows, logRows, monitorStatus, onTimeRows, statusRows, temperatureRows, warmupSeries } from '@/utils/monitor'
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

  test('độ sáng: chỉ máy đang bật, sáng nhất trước', () => {
    const r = brightnessRows([proj('a', { power: 'on', telemetry: tel(0, 50) }), proj('b', { power: 'on', telemetry: tel(0, 90) }), proj('c', { power: 'standby', telemetry: tel(0, 100) })])
    expect(r.rows.map(p => p.id)).toEqual(['b', 'a'])
    expect([r.off, r.avg]).toEqual([1, 70])
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

describe('warmupSeries (nhiệt độ theo thời gian từ lúc bật)', () => {
  const now = 10_000_000
  test('x = thời gian kể từ lúc bật; bỏ mẫu của lần bật trước; thêm điểm hiện tại', () => {
    const on = proj('a', { power: 'on', poweredOnAt: now - 600_000, telemetry: tel(48) })
    const hist = (id: string) => id === 'a' ? [{ t: now - 900_000, c: 30 }, { t: now - 500_000, c: 35 }, { t: now - 100_000, c: 44 }] : []
    const [s] = warmupSeries([on], hist, now)
    expect(s!.points).toEqual([{ x: 100_000, y: 35 }, { x: 500_000, y: 44 }, { x: 600_000, y: 48 }])
  })

  test('máy không bật, chưa có mốc bật, hoặc chưa có số đo thì không có đường', () => {
    const none = () => []
    expect(warmupSeries([proj('a', { power: 'standby', poweredOnAt: 1, telemetry: tel(40) }), proj('b', { power: 'on', telemetry: tel(40) }), proj('c', { power: 'on', poweredOnAt: 1, telemetry: tel(0) })], none, now)).toEqual([])
  })

  test('điểm hiện tại không trùng / lùi so với mẫu cuối', () => {
    const on = proj('a', { power: 'on', poweredOnAt: now - 1000, telemetry: tel(40) })
    const [s] = warmupSeries([on], () => [{ t: now, c: 41 }], now)
    expect(s!.points).toEqual([{ x: 1000, y: 41 }])
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

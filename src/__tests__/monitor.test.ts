import { describe, expect, test } from 'vitest'
import { activeErrors, brightnessRows, logRows, monitorStatus, onTimeRows, statusRows, temperatureRows } from '@/utils/monitor'
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

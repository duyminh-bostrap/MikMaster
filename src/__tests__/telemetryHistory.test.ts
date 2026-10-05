import { beforeEach, describe, expect, test } from 'vitest'
import { FULL_MS, MAX_AGE_MS, MIN_GAP_MS, _thin, clearHistory, eventsOf, historyOf, recordTelemetry } from '@/services/telemetryHistory'
import { createProjector } from '@/utils/projector'
import type { Projector } from '@/types'

const proj = (id: string, c: number, patch: Partial<Projector> = {}): Projector => {
  const p = createProjector({ id, boothId: 'b', name: id, ip: '10.0.0.1' })
  return { ...p, power: 'on', connection: 'connected', ...patch, telemetry: { ...p.telemetry, temperatureC: c } }
}

describe('telemetryHistory', () => {
  beforeEach(() => clearHistory())

  test('ghi lần bật (mốc = poweredOnAt) và lần tắt; mất kết nối cũng tính là hết bật (đánh dấu lost)', () => {
    recordTelemetry([proj('a', 40, { poweredOnAt: 500 })], 1000)
    recordTelemetry([proj('a', 40, { poweredOnAt: 500 })], 2000) // vẫn bật → không thêm sự kiện
    recordTelemetry([proj('a', 0, { power: 'standby' })], 3000)
    recordTelemetry([proj('a', 41, { poweredOnAt: 4000 })], 4000)
    recordTelemetry([proj('a', 41, { connection: 'disconnected' })], 5000)
    expect(eventsOf('a')).toEqual([{ t: 500, on: true }, { t: 3000, on: false }, { t: 4000, on: true }, { t: 5000, on: false, lost: true }])
  })

  test('mỗi lần cập nhật một mẫu (cách nhau ≥ MIN_GAP_MS): nhiệt độ thật (kể cả đang chờ), mẫu "tắt" khi tắt mà không có số đo, KHÔNG có mẫu khi mất kết nối', () => {
    recordTelemetry([proj('a', 40), proj('b', 0), proj('c', 50, { power: 'standby' }), proj('d', 33, { connection: 'disconnected' })], 1000)
    expect(historyOf('a')).toEqual([{ t: 1000, c: 40 }])
    expect(historyOf('b')).toEqual([]) // bật nhưng chưa có số đo
    expect(historyOf('c')).toEqual([{ t: 1000, c: 50 }]) // đang chờ nhưng vẫn báo nhiệt độ: mẫu nhiệt độ thật
    recordTelemetry([proj('e', 0, { power: 'standby' })], 1000)
    expect(historyOf('e')).toEqual([{ t: 1000, c: 0, off: true }]) // chờ và không báo gì: đáy trục
    expect(historyOf('d')).toEqual([]) // mất kết nối: đứt
    recordTelemetry([proj('a', 41)], 1000 + MIN_GAP_MS - 1)
    recordTelemetry([proj('a', 42)], 1000 + MIN_GAP_MS)
    expect(historyOf('a').map(s => s.c)).toEqual([40, 42])
  })

  test('mẫu cũ hơn FULL_MS được thưa bớt, nhưng giữ chỗ đổi giữa bật và tắt', () => {
    const list = Array.from({ length: 60 }, (_, i) => ({ t: i * 1000, c: 30 }))
    list.push({ t: 60_000, c: 0, off: true } as never)
    _thin(list as never, FULL_MS + 100_000)
    expect(list.length).toBeLessThan(10)
    expect(list.some(s => 'off' in s)).toBe(true)
  })

  test('bỏ mẫu cũ hơn MAX_AGE_MS', () => {
    recordTelemetry([proj('a', 40)], 0)
    recordTelemetry([proj('a', 50)], MAX_AGE_MS / 2)
    recordTelemetry([proj('a', 60)], MAX_AGE_MS + MIN_GAP_MS)
    expect(historyOf('a').map(s => s.c)).toEqual([50, 60])
  })

  test('clearHistory xoá hết', () => {
    recordTelemetry([proj('a', 40)], 1000)
    clearHistory()
    expect([historyOf('a'), eventsOf('a')]).toEqual([[], []])
  })
})

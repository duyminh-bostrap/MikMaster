import { beforeEach, describe, expect, test } from 'vitest'
import { MAX_AGE_MS, MIN_GAP_MS, clearHistory, historyOf, recordTemperatures } from '@/services/telemetryHistory'
import { createProjector } from '@/utils/projector'
import type { Projector } from '@/types'

const proj = (id: string, c: number, connection: Projector['connection'] = 'connected'): Projector => {
  const p = createProjector({ id, boothId: 'b', name: id, ip: '10.0.0.1' })
  return { ...p, connection, telemetry: { ...p.telemetry, temperatureC: c } }
}

describe('telemetryHistory', () => {
  beforeEach(() => clearHistory())

  test('ghi mẫu theo từng máy, bỏ máy không có số đo hoặc mất kết nối', () => {
    expect(recordTemperatures([proj('a', 40), proj('b', 0), proj('c', 50, 'disconnected')], 1000)).toBe(true)
    expect(historyOf('a')).toEqual([{ t: 1000, c: 40 }])
    expect(historyOf('b')).toEqual([])
    expect(historyOf('c')).toEqual([])
  })

  test('không ghi dày hơn MIN_GAP_MS', () => {
    recordTemperatures([proj('a', 40)], 1000)
    expect(recordTemperatures([proj('a', 41)], 1000 + MIN_GAP_MS - 1)).toBe(false)
    expect(recordTemperatures([proj('a', 42)], 1000 + MIN_GAP_MS)).toBe(true)
    expect(historyOf('a').map(s => s.c)).toEqual([40, 42])
  })

  test('bỏ mẫu cũ hơn MAX_AGE_MS', () => {
    recordTemperatures([proj('a', 40)], 0)
    recordTemperatures([proj('a', 50)], MAX_AGE_MS / 2)
    recordTemperatures([proj('a', 60)], MAX_AGE_MS + MIN_GAP_MS)
    expect(historyOf('a').map(s => s.c)).toEqual([50, 60])
  })

  test('clearHistory xoá hết', () => {
    recordTemperatures([proj('a', 40)], 1000)
    clearHistory()
    expect(historyOf('a')).toEqual([])
  })
})

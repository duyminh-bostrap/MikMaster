import { describe, expect, test } from 'vitest'
import { isValidIPv4 } from '@/utils/network'
import { computeFleetStats } from '@/utils/fleet'
import { applyLensDelta, clamp } from '@/utils/lens'
import { createProjector, getPreviewState } from '@/utils/projector'

const proj = (patch: object = {}) => ({ ...createProjector({ id: 'x', boothId: 'b', name: 'n', ip: '10.0.0.1' }), ...patch })

describe('isValidIPv4', () => {
  test.each(['0.0.0.0', '192.168.1.1', '255.255.255.255'])('hợp lệ: %s', v => expect(isValidIPv4(v)).toBe(true))
  test.each(['', '1.2.3', '1.2.3.4.5', '256.1.1.1', 'a.b.c.d', '1.2.3.-4', '1..3.4', '1.2.3.4 '])('không hợp lệ: "%s"', v => expect(isValidIPv4(v)).toBe(false))
})

describe('clamp / applyLensDelta', () => {
  test('clamp', () => {
    expect([clamp(5, 0, 10), clamp(-5, 0, 10), clamp(50, 0, 10)]).toEqual([5, 0, 10])
  })
  test('delta rỗng giữ nguyên vị trí', () => {
    const pos = { shiftX: 1, shiftY: 2, zoom: 3, focus: 4 }
    expect(applyLensDelta(pos, {})).toEqual(pos)
  })
})

describe('getPreviewState — thứ tự ưu tiên', () => {
  test('mất liên lạc thắng mọi thứ', () => {
    expect(getPreviewState(proj({ connection: 'disconnected', power: 'on' }))).toBe('nolink')
  })
  test('off > standby > shutter > pattern > live', () => {
    expect(getPreviewState(proj({ power: 'off' }))).toBe('off')
    expect(getPreviewState(proj({ power: 'standby', shutter: true }))).toBe('standby')
    expect(getPreviewState(proj({ power: 'on', shutter: true, testPattern: { enabled: true, type: 'grid' } }))).toBe('shutter')
    expect(getPreviewState(proj({ power: 'on', testPattern: { enabled: true, type: 'grid' } }))).toBe('pattern')
    expect(getPreviewState(proj({ power: 'on' }))).toBe('live')
  })
})

describe('computeFleetStats', () => {
  test('danh sách rỗng', () => {
    expect(computeFleetStats([])).toMatchObject({ total: 0, online: 0, alerts: 0, avgTemp: 0, hottest: null, totalLampHours: 0 })
  })

  test('bỏ máy tắt và máy không báo nhiệt khỏi nhiệt độ trung bình', () => {
    const t = (temperatureC: number, lampHours = 0) => ({ temperatureC, lampHours, brightness: 0 })
    const stats = computeFleetStats([
      proj({ power: 'on', telemetry: t(60, 10) }),
      proj({ power: 'on', telemetry: t(70, 20) }),
      proj({ power: 'off', telemetry: t(90) }),
      proj({ power: 'on', telemetry: t(0) }),
    ])
    expect(stats.avgTemp).toBe(65)
    expect(stats.totalLampHours).toBe(30)
    expect(stats.online).toBe(3)
  })

  test('online cần bật và đang kết nối; alerts đếm máy có lỗi', () => {
    const stats = computeFleetStats([
      proj({ power: 'on' }),
      proj({ power: 'on', connection: 'disconnected', errors: ['Offline'] }),
    ])
    expect([stats.online, stats.alerts]).toEqual([1, 1])
  })
})

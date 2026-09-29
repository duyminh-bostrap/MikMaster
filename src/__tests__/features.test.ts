import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cancelPowerSequence, getPowerSequence, removeFromPowerSequence, startPowerOnSequence } from '@/store/powerSequence'
import { matchesQuery, matchesStatus, nextProjectorId } from '@/utils/projectorFilter'
import { createProjector } from '@/utils/projector'
import { translate } from '@/i18n'

describe('bật lần lượt', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { cancelPowerSequence(); vi.useRealTimers() })

  test('bật máy đầu ngay, các máy sau cách nhau delay', () => {
    const on: string[] = []
    startPowerOnSequence(['a', 'b', 'c'], 5000, id => on.push(id))
    expect(on).toEqual(['a'])
    expect(getPowerSequence()?.done).toBe(1)
    vi.advanceTimersByTime(4999)
    expect(on).toEqual(['a'])
    vi.advanceTimersByTime(1)
    expect(on).toEqual(['a', 'b'])
    vi.advanceTimersByTime(5000)
    expect(on).toEqual(['a', 'b', 'c'])
    expect(getPowerSequence()).toBeNull()
  })

  test('delay 0 hoặc một máy → bật cùng lúc', () => {
    const on: string[] = []
    startPowerOnSequence(['a', 'b'], 0, id => on.push(id))
    expect(on).toEqual(['a', 'b'])
    expect(getPowerSequence()).toBeNull()
  })

  test('dừng giữa chừng: các máy còn lại không bật', () => {
    const on: string[] = []
    startPowerOnSequence(['a', 'b', 'c'], 1000, id => on.push(id))
    cancelPowerSequence()
    vi.advanceTimersByTime(5000)
    expect(on).toEqual(['a'])
  })

  test('tắt một máy đang chờ → gỡ khỏi hàng chờ; tắt hết máy chờ → huỷ chuỗi', () => {
    const on: string[] = []
    startPowerOnSequence(['a', 'b', 'c'], 1000, id => on.push(id))
    removeFromPowerSequence(['b'])
    vi.advanceTimersByTime(1000)
    expect(on).toEqual(['a', 'c'])
    startPowerOnSequence(['x', 'y'], 1000, id => on.push(id))
    removeFromPowerSequence(['y'])
    expect(getPowerSequence()).toBeNull()
  })

  test('chuỗi mới thay chuỗi cũ', () => {
    const on: string[] = []
    startPowerOnSequence(['a', 'b'], 1000, id => on.push(id))
    startPowerOnSequence(['c', 'd'], 1000, id => on.push(id))
    vi.advanceTimersByTime(3000)
    expect(on).toEqual(['a', 'c', 'd'])
  })
})

describe('bộ lọc máy chiếu', () => {
  const p = { ...createProjector({ id: 'PJ-07', boothId: 'b', name: 'Màn Trái', ip: '192.168.1.57', model: 'Panasonic PT-RQ35K', location: 'Truss' }), power: 'on' as const }

  test('tìm theo tên (không dấu), IP, model, booth, mã; nhiều từ phải khớp hết', () => {
    expect(matchesQuery(p, 'man trai')).toBe(true)
    expect(matchesQuery(p, '1.57')).toBe(true)
    expect(matchesQuery(p, 'rq35k pj-07')).toBe(true)
    expect(matchesQuery(p, 'stage', 'Main Stage')).toBe(true)
    expect(matchesQuery(p, 'christie')).toBe(false)
    expect(matchesQuery(p, '   ')).toBe(true)
  })

  test('lọc theo trạng thái', () => {
    expect(matchesStatus(p, 'on')).toBe(true)
    expect(matchesStatus(p, 'off')).toBe(false)
    const offline = { ...p, connection: 'disconnected' as const }
    expect([matchesStatus(offline, 'on'), matchesStatus(offline, 'offline'), matchesStatus(offline, 'alerts')]).toEqual([false, true, true])
  })

  test('mã máy mới không trùng', () => {
    const mk = (id: string) => createProjector({ id, boothId: 'b', name: id, ip: '10.0.0.1' })
    expect(nextProjectorId([])).toBe('PJ-01')
    expect(nextProjectorId([mk('PJ-01'), mk('PJ-09'), mk('X')])).toBe('PJ-10')
  })
})

describe('dịch', () => {
  test('tiếng Anh: số ít / số nhiều theo n; thiếu bản dịch thì giữ tiếng Anh', () => {
    expect(translate('en', '{n} DEVICE(S)', { n: 1 })).toBe('1 DEVICE')
    expect(translate('en', '{n} DEVICE(S)', { n: 6 })).toBe('6 DEVICES')
    expect(translate('en', '{n} address(es)', { n: 2 })).toBe('2 addresses')
    expect(translate('vi', '{n} DEVICE(S)', { n: 6 })).toBe('6 MÁY')
    expect(translate('vi', 'no such key {x}', { x: 1 })).toBe('no such key 1')
  })
})

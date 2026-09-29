import { describe, expect, test } from 'vitest'
import { applyRemote } from '@/utils/sync'
import { createProjector } from '@/utils/projector'

const base = () => createProjector({ id: 'PJ-T', boothId: 'b', name: 'T', ip: '10.0.0.1' })
const ok = (status: object) => ({ ok: true as const, status: { errors: [], ...status } })
const fail = (code: string, message = 'boom') => ({ ok: false as const, code, message })

describe('applyRemote — thành công', () => {
  test('máy báo on/warmup → power on, brightness mặc định', () => {
    for (const power of ['on', 'warmup'] as const) {
      const p = applyRemote(base(), ok({ power }))
      expect(p.power).toBe('on')
      expect(p.telemetry.brightness).toBeGreaterThan(0)
    }
  })

  test('standby/cooling → standby, brightness 0', () => {
    const on = { ...base(), power: 'on' as const, telemetry: { temperatureC: 0, lampHours: 0, brightness: 85 } }
    const p = applyRemote(on, ok({ power: 'cooling' }))
    expect(p.power).toBe('standby')
    expect(p.telemetry.brightness).toBe(0)
  })

  test('giữ "off" của người vận hành khi máy báo standby', () => {
    expect(applyRemote({ ...base(), power: 'off' }, ok({ power: 'standby' })).power).toBe('off')
  })

  test('không có power trong status thì giữ nguyên', () => {
    expect(applyRemote({ ...base(), power: 'on' }, ok({})).power).toBe('on')
  })

  test('input lạ bị bỏ qua, input hợp lệ được áp', () => {
    expect(applyRemote(base(), ok({ input: 'VGA-9' })).input).toBe('HDMI 1')
    expect(applyRemote(base(), ok({ input: 'SDI 2' })).input).toBe('SDI 2')
  })

  test('lampHours cập nhật, thiếu thì giữ', () => {
    const p = { ...base(), telemetry: { temperatureC: 0, lampHours: 100, brightness: 0 } }
    expect(applyRemote(p, ok({ lampHours: 250 })).telemetry.lampHours).toBe(250)
    expect(applyRemote(p, ok({})).telemetry.lampHours).toBe(100)
  })

  test('khôi phục kết nối ghi log "Connection restored" và xoá lỗi liên lạc', () => {
    const down = applyRemote(base(), fail('timeout'))
    const back = applyRemote(down, ok({ power: 'on' }))
    expect(back.connection).toBe('connected')
    expect(back.errors).toEqual([])
    expect(back.log[0]?.message).toBe('Connection restored')
  })

  test('lỗi mới từ thiết bị được log đúng một lần', () => {
    const once = applyRemote(base(), ok({ errors: ['Fan'] }))
    const twice = applyRemote(once, ok({ errors: ['Fan'] }))
    expect(once.log.filter(l => l.message === 'Fan')).toHaveLength(1)
    expect(twice.log.filter(l => l.message === 'Fan')).toHaveLength(1)
  })
})

describe('applyRemote — thất bại', () => {
  test.each(['connect', 'timeout', 'network'])('%s → disconnected + nhãn Offline', code => {
    const p = applyRemote(base(), fail(code))
    expect(p.connection).toBe('disconnected')
    expect(p.errors).toContain('Offline')
  })

  test.each(['auth', 'protocol', 'unsupported'])('%s → protocol-error', code => {
    const p = applyRemote(base(), fail(code))
    expect(p.connection).toBe('protocol-error')
    expect(p.errors).toContain('Protocol error')
  })

  test('mã lỗi khác (device/bad-request) không đổi trạng thái kết nối', () => {
    const p = applyRemote(base(), fail('device'))
    expect(p.connection).toBe('connected')
    expect(p.errors).toEqual([])
  })

  test('đổi từ Offline sang Protocol error thay nhãn cũ, giữ lỗi thiết bị', () => {
    const a = applyRemote({ ...base(), errors: ['High Temp'] }, fail('timeout'))
    const b = applyRemote(a, fail('auth', 'bad password'))
    expect(b.errors).toEqual(['Protocol error', 'High Temp'])
  })

  test('cùng lỗi lặp lại không spam log', () => {
    const a = applyRemote(base(), fail('timeout', 'x'))
    const b = applyRemote(a, fail('timeout', 'x'))
    expect(b.log).toHaveLength(a.log.length)
  })
})

import { describe, expect, test } from 'vitest'
import { PENDING_GRACE_MS, applyRemote } from '@/utils/sync'
import { applyPowerPending, createProjector } from '@/utils/projector'

const base = () => createProjector({ id: 'PJ-T', boothId: 'b', name: 'T', ip: '10.0.0.1' })
const ok = (status: object) => ({ ok: true as const, status: { errors: [], ...status } })
const fail = (code: string, message = 'boom') => ({ ok: false as const, code, message })

describe('applyRemote — thành công', () => {
  test('máy báo on → ON (brightness mặc định); warmup → WARMING UP; cooling → COOLING DOWN; standby → standby', () => {
    const on = applyRemote(base(), ok({ power: 'on' }))
    expect([on.power, on.telemetry.brightness > 0]).toEqual(['on', true])
    expect(applyRemote(base(), ok({ power: 'warmup' })).power).toBe('warmup')
    const was = { ...base(), power: 'on' as const, telemetry: { temperatureC: 0, lampHours: 0, brightness: 85 } }
    const cooling = applyRemote(was, ok({ power: 'cooling' }))
    expect([cooling.power, cooling.telemetry.brightness]).toEqual(['cooling', 0])
    expect(applyRemote(was, ok({ power: 'standby' })).power).toBe('standby')
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

  test('auth → auth-failed + nhãn Login required (không lẫn với lỗi mạng / giao thức)', () => {
    const p = applyRemote(base(), fail('auth'))
    expect(p.connection).toBe('auth-failed')
    expect(p.errors).toContain('Login required')
  })

  test.each(['protocol', 'unsupported'])('%s → protocol-error', code => {
    const p = applyRemote(base(), fail(code))
    expect(p.connection).toBe('protocol-error')
    expect(p.errors).toContain('Protocol error')
  })

  test('mã lỗi khác (device/bad-request) không đổi trạng thái kết nối', () => {
    const p = applyRemote(base(), fail('device'))
    expect(p.connection).toBe('connected')
    expect(p.errors).toEqual([])
  })

  test('đổi từ Offline sang Login required thay nhãn cũ, giữ lỗi thiết bị', () => {
    const a = applyRemote({ ...base(), errors: ['High Temp'] }, fail('timeout'))
    const b = applyRemote(a, fail('auth', 'bad password'))
    expect(b.errors).toEqual(['Login required', 'High Temp'])
  })

  test('cùng lỗi lặp lại không spam log', () => {
    const a = applyRemote(base(), fail('timeout', 'x'))
    const b = applyRemote(a, fail('timeout', 'x'))
    expect(b.log).toHaveLength(a.log.length)
  })
})

describe('lệnh bật / tắt đã gửi thành công → chờ máy xác nhận', () => {
  const T0 = 1_000_000
  const sent = (to: 'on' | 'standby') => applyPowerPending(to === 'on' ? base() : { ...base(), power: 'on' as const }, to, T0)

  test('applyPowerPending: bật → WARMING UP, tắt → COOLING DOWN; máy đã ở đích thì không đổi', () => {
    expect(sent('on').power).toBe('warmup')
    expect(sent('standby').power).toBe('cooling')
    const on = { ...base(), power: 'on' as const }
    expect(applyPowerPending(on, 'on', T0)).toBe(on)
    const standby = { ...base(), power: 'standby' as const }
    expect(applyPowerPending(standby, 'standby', T0)).toBe(standby)
  })

  test('máy chưa kịp phản ứng (vẫn báo standby) trong thời gian chờ → giữ WARMING UP; máy báo on → ON và hết chờ', () => {
    const p = sent('on')
    const stillOff = applyRemote(p, ok({ power: 'standby' }), T0 + 5_000)
    expect([stillOff.power, !!stillOff.powerPending]).toEqual(['warmup', true])
    const confirmed = applyRemote(p, ok({ power: 'on' }), T0 + 5_000)
    expect([confirmed.power, confirmed.powerPending]).toEqual(['on', undefined])
    const warming = applyRemote(p, ok({ power: 'warmup' }), T0 + 5_000) // máy đang khởi động thật
    expect([warming.power, warming.powerPending]).toEqual(['warmup', undefined])
  })

  test('tắt: máy báo cooling → COOLING DOWN; báo standby → OFF (standby) và hết chờ; vẫn báo on trong thời gian chờ → giữ COOLING DOWN', () => {
    const p = sent('standby')
    expect(applyRemote(p, ok({ power: 'on' }), T0 + 3_000).power).toBe('cooling')
    expect(applyRemote(p, ok({ power: 'cooling' }), T0 + 3_000).power).toBe('cooling')
    const done = applyRemote(p, ok({ power: 'standby' }), T0 + 40_000)
    expect([done.power, done.powerPending]).toEqual(['standby', undefined])
  })

  test('quá hạn mà máy vẫn ở trạng thái cũ → lệnh không có hiệu lực: theo máy và ghi cảnh báo', () => {
    const p = sent('on')
    const r = applyRemote(p, ok({ power: 'standby' }), T0 + PENDING_GRACE_MS + 1)
    expect([r.power, r.powerPending]).toEqual(['standby', undefined])
    expect(r.log[0]).toMatchObject({ level: 'warn' })
  })
})

describe('độ sáng và test pattern máy báo về', () => {
  test('máy báo độ sáng → theo máy (kể cả khi đang chờ); không báo → giá trị của app khi bật, 0 khi tắt', () => {
    expect(applyRemote(base(), ok({ power: 'on', brightness: 40 })).telemetry.brightness).toBe(40)
    expect(applyRemote(base(), ok({ power: 'standby', brightness: 25 })).telemetry.brightness).toBe(25)
    expect(applyRemote(base(), ok({ power: 'on' })).telemetry.brightness).toBeGreaterThan(0)
    expect(applyRemote({ ...base(), power: 'on' as const }, ok({ power: 'standby' })).telemetry.brightness).toBe(0)
  })

  test('máy báo test pattern → bật / tắt và loại mẫu theo máy; không báo thì giữ nguyên', () => {
    const on = applyRemote(base(), ok({ power: 'on', testPattern: { enabled: true, pattern: 'color-bars' } }))
    expect(on.testPattern).toEqual({ enabled: true, type: 'color-bars' })
    const unknown = applyRemote(on, ok({ power: 'on', testPattern: { enabled: true } })) // mã máy không ánh xạ được → giữ loại cũ
    expect(unknown.testPattern).toEqual({ enabled: true, type: 'color-bars' })
    expect(applyRemote(on, ok({ power: 'on', testPattern: { enabled: false } })).testPattern.enabled).toBe(false)
    expect(applyRemote(on, ok({ power: 'on' })).testPattern).toEqual(on.testPattern)
  })
})

import { beforeEach, describe, expect, test } from 'vitest'
import { RE_ARM_MARGIN, checkHighTemperature, resetAlerts } from '@/services/alerts'
import { collectWarnings } from '@/utils/warnings'
import { createProjector } from '@/utils/projector'
import type { Projector } from '@/types'

const proj = (id: string, c: number, patch: Partial<Projector> = {}): Projector => {
  const p = createProjector({ id, boothId: 'b', name: id, ip: '10.0.0.1' })
  return { ...p, connection: 'connected', ...patch, telemetry: { ...p.telemetry, temperatureC: c } }
}

describe('pop-up nhiệt độ cao (> 40°C)', () => {
  beforeEach(() => resetAlerts())

  test('chỉ khi VƯỢT 40°C (40 chưa tính), một lần cho mỗi lần vượt', () => {
    expect(checkHighTemperature([proj('a', 40)])).toHaveLength(0)
    expect(checkHighTemperature([proj('a', 41)]).map(a => a.projectorId)).toEqual(['a'])
    expect(checkHighTemperature([proj('a', 45)])).toHaveLength(0) // vẫn nóng: không báo lại
  })

  test('chỉ được báo lại sau khi nguội xuống dưới 40 − RE_ARM_MARGIN (tránh báo liên tục khi dao động quanh ngưỡng)', () => {
    checkHighTemperature([proj('a', 42)])
    expect(checkHighTemperature([proj('a', 39)])).toHaveLength(0)
    expect(checkHighTemperature([proj('a', 41)])).toHaveLength(0) // 39 chưa đủ nguội
    checkHighTemperature([proj('a', 40 - RE_ARM_MARGIN)])
    expect(checkHighTemperature([proj('a', 41)])).toHaveLength(1)
  })

  test('máy mất kết nối hoặc không báo nhiệt độ không bị cảnh báo; nhiều máy trong một lần', () => {
    expect(checkHighTemperature([proj('a', 50, { connection: 'disconnected' }), proj('b', 0)])).toHaveLength(0)
    expect(checkHighTemperature([proj('c', 41), proj('d', 44)]).map(a => a.projectorId)).toEqual(['c', 'd'])
  })
})

describe('collectWarnings', () => {
  test('lỗi + nhiệt độ cao (> 40) + nhiệt độ cảnh báo (> 33); nguy hiểm trước; máy mất kết nối không tính nhiệt độ', () => {
    const w = collectWarnings([
      proj('warm', 35), proj('hot', 42), proj('err', 0, { errors: ['Lamp'] }), proj('ok', 30), proj('lost', 50, { connection: 'disconnected' }),
    ])
    expect(w.map(x => [x.projector.id, x.kind])).toEqual([['hot', 'hot'], ['err', 'error'], ['warm', 'warm']])
    expect(collectWarnings([proj('edge', 33), proj('edge40', 40)]).map(x => x.kind)).toEqual(['warm']) // 33 chưa tính; 40 là cảnh báo (chưa nguy hiểm)
  })
})

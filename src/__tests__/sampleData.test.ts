import { describe, expect, test } from 'vitest'
import { sampleHistory, sampleProjectors } from '@/utils/sampleData'
import { monitorStatus, warmupSeries } from '@/utils/monitor'
import { createProjector } from '@/utils/projector'

const ps = Array.from({ length: 12 }, (_, i) => createProjector({ id: `PJ-${String(i + 1).padStart(2, '0')}`, boothId: 'b', name: `P${i + 1}`, ip: `10.0.0.${i + 1}` }))
const now = 1_800_000_000_000

describe('dữ liệu mẫu cho Dashboard', () => {
  test('xác định (cùng đầu vào → cùng kết quả) và không sửa máy thật', () => {
    const before = JSON.stringify(ps)
    const a = sampleProjectors(ps, now), b = sampleProjectors(ps, now)
    expect(a).toEqual(b)
    expect(JSON.stringify(ps)).toBe(before)
  })

  test('có đủ các trạng thái để xem: bật, chờ, mất kết nối, có máy vượt ngưỡng nguy hiểm', () => {
    const s = sampleProjectors(ps, now)
    const keys = new Set(s.map(p => monitorStatus(p).key))
    expect(keys).toContain('on')
    expect(keys).toContain('standby')
    expect(keys).toContain('offline')
    expect(Math.max(...s.map(p => p.telemetry.temperatureC))).toBeGreaterThanOrEqual(70)
    expect(s.filter(p => p.power === 'on').every(p => p.poweredOnAt !== undefined && p.poweredOnAt < now)).toBe(true)
  })

  test('lịch sử mẫu: tăng dần về nhiệt độ làm việc, mốc thời gian đều và trong khoảng từ lúc bật tới hiện tại', () => {
    const p = sampleProjectors(ps, now).find(x => x.power === 'on' && x.connection === 'connected')!
    const h = sampleHistory(p, now)
    expect(h.length).toBeGreaterThan(10)
    expect(h[0]!.t).toBe(p.poweredOnAt)
    expect(h.every((s, i) => i === 0 || s.t - h[i - 1]!.t === 30_000)).toBe(true)
    expect(h[0]!.c).toBeLessThan(h[h.length - 1]!.c)
    expect(Math.abs(h[h.length - 1]!.c - p.telemetry.temperatureC)).toBeLessThanOrEqual(Math.ceil(p.telemetry.temperatureC * 0.25))
    // máy chờ không có lịch sử
    expect(sampleHistory(sampleProjectors(ps, now).find(x => x.power === 'standby')!, now)).toEqual([])
  })

  test('đưa vào warmupSeries được một đường cho mỗi máy đang bật', () => {
    const s = sampleProjectors(ps, now)
    const hist = new Map(s.map(p => [p.id, sampleHistory(p, now)]))
    const series = warmupSeries(s, id => hist.get(id) ?? [], now)
    expect(series.length).toBe(s.filter(p => p.power === 'on').length) // máy mất kết nối vẫn giữ đường tới lúc mất
  })
})

import { describe, expect, test } from 'vitest'
import { sampleData } from '@/utils/sampleData'
import { monitorStatus, timeline } from '@/utils/monitor'
import { createProjector } from '@/utils/projector'

const ps = Array.from({ length: 12 }, (_, i) => createProjector({ id: `PJ-${String(i + 1).padStart(2, '0')}`, boothId: 'b', name: `P${i + 1}`, ip: `10.0.0.${i + 1}` }))
const now = 1_800_000_000_000

describe('dữ liệu mẫu cho Dashboard', () => {
  test('xác định (cùng đầu vào → cùng kết quả) và không sửa máy thật', () => {
    const before = JSON.stringify(ps)
    expect(sampleData(ps, now)).toEqual(sampleData(ps, now))
    expect(JSON.stringify(ps)).toBe(before)
  })

  test('có đủ tình huống: bật, chờ (đã tắt), mất kết nối, bật lại, vượt ngưỡng nguy hiểm', () => {
    const s = sampleData(ps, now)
    const keys = new Set(s.projectors.map(p => monitorStatus(p).key))
    for (const k of ['on', 'standby', 'offline'] as const) expect(keys).toContain(k)
    expect([...s.events.values()].some(ev => ev.filter(e => e.on).length >= 2)).toBe(true) // tắt rồi bật lại
    expect(Math.max(...[...s.history.values()].flat().map(x => x.c))).toBeGreaterThanOrEqual(65)
  })

  test('nhiệt độ chỉ có trong lúc bật', () => {
    const s = sampleData(ps, now)
    for (const p of s.projectors) {
      const ev = s.events.get(p.id)!
      for (const sm of s.history.get(p.id)!) {
        const inside = ev.some((e, k) => e.on && sm.t >= e.t && sm.t <= (ev[k + 1]?.t ?? now))
        expect(inside).toBe(true)
      }
    }
  })

  test('timeline: gốc = máy đầu tiên bật; máy bật lại có 2 đoạn; mọi máy từng bật đều có đường', () => {
    const s = sampleData(ps, now)
    const tl = timeline(s.projectors, id => s.history.get(id) ?? [], id => s.events.get(id) ?? [], now)!
    const firstOn = Math.min(...[...s.events.values()].flat().filter(e => e.on).map(e => e.t))
    expect(tl.origin).toBe(firstOn)
    expect(tl.series).toHaveLength(ps.length)
    expect(tl.series.some(sr => sr.segments.length === 2)).toBe(true)
    expect(tl.series.flatMap(sr => sr.events).some(e => !e.on)).toBe(true)
  })
})

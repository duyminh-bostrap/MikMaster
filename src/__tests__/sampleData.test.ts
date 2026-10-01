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
    expect(Math.max(...[...s.history.values()].flat().map(x => x.c))).toBeGreaterThan(38) // có máy vượt ngưỡng nguy hiểm 40°C
    expect(Math.min(...[...s.history.values()].flat().filter(x => !x.off).map(x => x.c))).toBeGreaterThanOrEqual(19)
  })

  test('nhiệt độ chỉ có khi bật; tắt → mẫu "tắt"; mất kết nối → không có mẫu', () => {
    const s = sampleData(ps, now)
    for (const p of s.projectors) {
      const ev = s.events.get(p.id)!
      for (const sm of s.history.get(p.id)!) {
        const k = ev.findIndex((_, i) => sm.t >= ev[i]!.t && sm.t < (ev[i + 1]?.t ?? Infinity))
        const e = ev[k]!
        expect(e.lost).toBeFalsy() // không có mẫu trong lúc mất kết nối
        if (e.on) expect(sm.off).toBeFalsy() // bật: nhiệt độ
        else if (p.power === 'standby') expect(sm.off).toBeFalsy() // máy chờ vẫn báo nhiệt độ (nguội dần)
        else expect(sm.off).toBe(true) // tắt hẳn: mẫu "tắt"
      }
    }
  })

  test('timeline: gốc = máy đầu tiên bật; máy tắt rồi bật lại vẫn MỘT đoạn liền (rơi xuống đáy); máy mất kết nối còn đường tới lúc mất', () => {
    const s = sampleData(ps, now)
    const tl = timeline(s.projectors, id => s.history.get(id) ?? [], id => s.events.get(id) ?? [], now)!
    const firstOn = Math.min(...[...s.events.values()].flat().filter(e => e.on).map(e => e.t))
    expect(tl.origin).toBe(firstOn)
    expect(tl.series).toHaveLength(ps.length)
    const restarted = tl.series.find(sr => sr.events.filter(e => e.on).length >= 2)!
    expect(restarted.segments).toHaveLength(1)
    expect(restarted.segments[0]!.some(p => p.y === null)).toBe(true)
    expect(tl.series.flatMap(sr => sr.events).some(e => !e.on)).toBe(true)
  })
})

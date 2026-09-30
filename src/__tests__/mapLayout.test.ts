import { describe, expect, test } from 'vitest'
import { MAP, autoLayout, canvasHeight, clampPos, groupColor, sanitizeMapPos, snap } from '@/utils/mapLayout'
import { createProjector } from '@/utils/projector'
import { documentFingerprint } from '@/utils/document'

const proj = (id: string, boothId: string) => createProjector({ id, boothId, name: id, ip: '10.0.0.1' })
const booths = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]

describe('autoLayout', () => {
  test('mỗi group một dải, các dải xếp từ trên xuống; không hai máy trùng vị trí', () => {
    const ps = [proj('1', 'a'), proj('2', 'a'), proj('3', 'b'), proj('4', 'nope')]
    const { pos, height } = autoLayout(booths, ps)
    expect(pos['1']!.y).toBe(pos['2']!.y)
    expect(pos['2']!.x).toBeGreaterThan(pos['1']!.x)
    expect(pos['3']!.y).toBeGreaterThan(pos['1']!.y)
    expect(pos['4']!.y).toBeGreaterThan(pos['3']!.y) // group không còn tồn tại xếp cuối
    expect(new Set(Object.values(pos).map(p => `${p.x},${p.y}`)).size).toBe(4)
    expect(height).toBeGreaterThan(pos['4']!.y)
  })

  test('nhiều máy trong một group thì xuống hàng, không tràn khỏi mặt phẳng', () => {
    const ps = Array.from({ length: 20 }, (_, i) => proj(String(i), 'a'))
    const { pos } = autoLayout(booths, ps)
    for (const p of Object.values(pos)) expect(p.x + MAP.nodeW).toBeLessThanOrEqual(MAP.width)
    expect(new Set(Object.values(pos).map(p => p.y)).size).toBeGreaterThan(1)
  })
})

describe('vị trí trên sơ đồ', () => {
  test('clampPos giữ ô trong mặt phẳng; snap theo lưới', () => {
    expect(clampPos({ x: -50, y: -5 }, 600)).toEqual({ x: 0, y: 0 })
    expect(clampPos({ x: 99999, y: 99999 }, 600)).toEqual({ x: MAP.width - MAP.nodeW, y: 600 - MAP.nodeH })
    expect(snap(13)).toBe(16)
    expect(snap(11)).toBe(8)
  })

  test('canvasHeight đủ chứa ô thấp nhất', () => {
    expect(canvasHeight([], 100)).toBe(MAP.minHeight)
    expect(canvasHeight([{ x: 0, y: 2000 }], 100)).toBe(2000 + MAP.nodeH + MAP.pad)
  })

  test('sanitizeMapPos: chỉ nhận số hữu hạn, kẹp vào giới hạn', () => {
    expect(sanitizeMapPos({ x: 10.4, y: 20.6 })).toEqual({ x: 10, y: 21 })
    expect(sanitizeMapPos({ x: -5, y: 99999 })).toEqual({ x: 0, y: 20_000 })
    expect(sanitizeMapPos({ x: 'a', y: 1 })).toBeUndefined()
    expect(sanitizeMapPos({ x: NaN, y: 1 })).toBeUndefined()
    expect(sanitizeMapPos(null)).toBeUndefined()
  })

  test('mỗi group một màu khác nhau', () => {
    expect(new Set([0, 1, 2, 3, 4, 5].map(groupColor)).size).toBe(6)
  })

  test('đặt vị trí là sửa project (hiện cảnh báo chưa lưu)', () => {
    const base = { project: { id: 'p', name: 'P', createdAt: '' }, booths, projectors: [proj('1', 'a')] }
    const moved = { ...base, projectors: [{ ...base.projectors[0]!, mapPos: { x: 8, y: 8 } }] }
    expect(documentFingerprint(moved)).not.toBe(documentFingerprint(base))
  })
})

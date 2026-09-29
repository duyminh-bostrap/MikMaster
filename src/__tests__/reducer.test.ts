import { describe, expect, test } from 'vitest'
import { initialProjectState, projectReducer, type ProjectState } from '@/store/projectReducer'
import { createMockProjectors, MOCK_BOOTHS } from '@/data/mock'
import { LENS_LIMITS } from '@/constants/lens'

function launched(): ProjectState {
  const projectors = createMockProjectors()
  return projectReducer(initialProjectState, {
    type: 'project/launch',
    payload: { project: { id: 'p', name: 'P', venue: 'V', createdAt: '2026-01-01' }, booths: MOCK_BOOTHS, projectors },
  })
}
const find = (s: ProjectState, id: string) => s.projectors.find(p => p.id === id)!

describe('projectReducer', () => {
  test('launch nạp dữ liệu, close trả về trạng thái rỗng', () => {
    const s = launched()
    expect(s.projectors.length).toBeGreaterThan(0)
    expect(projectReducer(s, { type: 'project/close' })).toEqual(initialProjectState)
  })

  test('setPower chỉ đụng tới các máy được chọn', () => {
    const s = launched()
    const next = projectReducer(s, { type: 'projectors/setPower', ids: ['PJ-01'], power: 'standby' })
    expect(find(next, 'PJ-01').power).toBe('standby')
    expect(find(next, 'PJ-01').telemetry.brightness).toBe(0)
    expect(find(next, 'PJ-02')).toBe(find(s, 'PJ-02'))
  })

  test('setShutter', () => {
    const next = projectReducer(launched(), { type: 'projectors/setShutter', ids: ['PJ-01', 'PJ-02'], shutter: true })
    expect([find(next, 'PJ-01').shutter, find(next, 'PJ-02').shutter]).toEqual([true, true])
  })

  test('log giữ tối đa 50 dòng, mới nhất ở đầu', () => {
    let s = launched()
    for (let i = 0; i < 60; i++) s = projectReducer(s, { type: 'projector/log', id: 'PJ-01', level: 'info', message: `m${i}` })
    const log = find(s, 'PJ-01').log
    expect(log).toHaveLength(50)
    expect(log[0]?.message).toBe('m59')
  })

  test('projector/sync đi qua applyRemote', () => {
    const s = projectReducer(launched(), { type: 'projector/sync', id: 'PJ-01', result: { ok: false, code: 'timeout', message: 'x' } })
    expect(find(s, 'PJ-01').connection).toBe('disconnected')
  })

  test('projectors/move đổi booth và ghi log; cùng booth thì không đổi gì', () => {
    const s = launched()
    const moved = projectReducer(s, { type: 'projectors/move', ids: ['PJ-01'], boothId: 'booth-c', boothName: 'Rear Screen' })
    expect(find(moved, 'PJ-01').boothId).toBe('booth-c')
    expect(find(moved, 'PJ-01').log[0]?.message).toBe('Moved to booth Rear Screen')
    const same = projectReducer(s, { type: 'projectors/move', ids: ['PJ-01'], boothId: find(s, 'PJ-01').boothId, boothName: 'x' })
    expect(find(same, 'PJ-01')).toBe(find(s, 'PJ-01'))
  })

  describe('lens', () => {
    test('adjust kẹp trong giới hạn và bỏ preset đang chọn', () => {
      const s = projectReducer(launched(), { type: 'lens/adjust', id: 'PJ-01', delta: { zoom: 1000, shiftX: -1000 } })
      const lens = find(s, 'PJ-01').lens
      expect(lens.position.zoom).toBe(LENS_LIMITS.zoom.max)
      expect(lens.position.shiftX).toBe(LENS_LIMITS.shift.min)
      expect(lens.activePreset).toBeNull()
    })

    test('save rồi load preset khôi phục đúng vị trí', () => {
      let s = launched()
      s = projectReducer(s, { type: 'lens/adjust', id: 'PJ-03', delta: { zoom: -20, focus: 10 } })
      const saved = find(s, 'PJ-03').lens.position
      s = projectReducer(s, { type: 'lens/savePreset', id: 'PJ-03', slot: 3, name: 'Mine' })
      s = projectReducer(s, { type: 'lens/adjust', id: 'PJ-03', delta: { zoom: 30 } })
      s = projectReducer(s, { type: 'lens/loadPreset', id: 'PJ-03', slot: 3 })
      expect(find(s, 'PJ-03').lens.position).toEqual(saved)
      expect(find(s, 'PJ-03').lens.activePreset).toBe(3)
    })

    test('load slot trống không đổi gì', () => {
      const s = launched()
      expect(projectReducer(s, { type: 'lens/loadPreset', id: 'PJ-03', slot: 4 })).toEqual(s)
    })

    test('resetShift chỉ về 0 shift, giữ zoom/focus', () => {
      let s = projectReducer(launched(), { type: 'lens/adjust', id: 'PJ-01', delta: { shiftX: 20, shiftY: 20 } })
      const { zoom, focus } = find(s, 'PJ-01').lens.position
      s = projectReducer(s, { type: 'lens/resetShift', id: 'PJ-01' })
      expect(find(s, 'PJ-01').lens.position).toEqual({ shiftX: 0, shiftY: 0, zoom, focus })
    })
  })
})

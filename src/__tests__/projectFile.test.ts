import { describe, expect, test } from 'vitest'
import { createMockProjectors, MOCK_BOOTHS } from '@/data/mock'
import { parseProjectFile, ProjectFileError, serializeProject, suggestedFileName } from '@/services/projectFile'
import { countMissingLogins } from '@/utils/credentials'

const snapshot = () => {
  const projectors = createMockProjectors()
  projectors[2] = { ...projectors[2]!, network: { ...projectors[2]!.network, protocol: { ...projectors[2]!.network.protocol, username: 'admin1', password: 'secret' } } }
  return { project: { id: 'p1', name: 'Show', createdAt: '2026-01-01' }, booths: MOCK_BOOTHS, projectors }
}

describe('project file', () => {
  test('save → open giữ nguyên project, booth, máy, lens preset', () => {
    const s = snapshot()
    const back = parseProjectFile(serializeProject(s))
    expect(back.project).toEqual(s.project)
    expect(back.booths).toEqual(s.booths)
    expect(back.projectors.map(p => [p.id, p.name, p.boothId, p.network.ip])).toEqual(s.projectors.map(p => [p.id, p.name, p.boothId, p.network.ip]))
    expect(back.projectors[0]!.lens.presets).toEqual(s.projectors[0]!.lens.presets)
  })

  test('không ghi mật khẩu vào file, giữ username; máy đó cần đăng nhập lại', () => {
    const text = serializeProject(snapshot())
    expect(text).not.toContain('secret')
    const back = parseProjectFile(text)
    expect(back.projectors[2]!.network.protocol).toMatchObject({ username: 'admin1', password: undefined })
    expect(countMissingLogins(back.projectors)).toBeGreaterThan(0)
  })

  test('trạng thái kết nối cũ trong file không được tin', () => {
    const s = snapshot()
    s.projectors[0] = { ...s.projectors[0]!, connection: 'protocol-error' }
    expect(parseProjectFile(serializeProject(s)).projectors[0]!.connection).toBe('connected')
  })

  test.each([
    ['không phải JSON', 'hello'],
    ['không phải file MikMaster', '{"a":1}'],
    ['bản mới hơn', '{"format":"mikmaster-project","version":99,"project":{"name":"x"},"booths":[],"projectors":[]}'],
    ['thiếu dữ liệu', '{"format":"mikmaster-project","version":1}'],
    ['máy không có IP', '{"format":"mikmaster-project","version":1,"project":{"name":"x"},"booths":[],"projectors":[{"id":"a","network":{}}]}'],
  ])('báo lỗi rõ ràng: %s', (_label, text) => {
    expect(() => parseProjectFile(text)).toThrow(ProjectFileError)
  })

  test('file tối thiểu được điền mặc định; booth lạ về booth đầu; id trùng được đổi', () => {
    const back = parseProjectFile(JSON.stringify({
      format: 'mikmaster-project', version: 1, project: { name: 'Mini' }, booths: [],
      projectors: [
        { id: 'A', boothId: 'nope', network: { ip: '10.0.0.1', protocol: { type: 'pjlink-class2', port: 4352 } } },
        { id: 'A', network: { ip: '10.0.0.2' } },
      ],
    }))
    expect(back.booths).toHaveLength(1)
    expect(back.projectors.every(p => p.boothId === back.booths[0]!.id)).toBe(true)
    expect(new Set(back.projectors.map(p => p.id)).size).toBe(2)
    expect(back.projectors[1]!.lens.presets).toHaveLength(4)
  })

  test('tên file an toàn', () => {
    expect(suggestedFileName('Show: A/B?')).toBe('Show AB.mikmaster.json')
    expect(suggestedFileName('   ')).toBe('project.mikmaster.json')
  })
})

describe('file từ các bản cũ (0.2.x / 0.3.x)', () => {
  test('còn venue, location của booth / máy, thiếu osd / commands → vẫn mở được, trường cũ bị bỏ qua', () => {
    const old = JSON.stringify({
      format: 'mikmaster-project', version: 1, exportedAt: '2026-09-29T10:00:00Z',
      project: { id: 'proj-1', name: 'Old Show', venue: 'Hanoi Opera House', createdAt: '2026-09-29' },
      booths: [{ id: 'booth-a', name: 'Main Stage', location: 'FOH Zone' }],
      projectors: [{
        id: 'PJ-01', boothId: 'booth-a', name: 'Stage Left', location: 'FOH', model: 'Panasonic PT-RQ35K',
        network: { ip: '192.168.1.21', protocol: { type: 'panasonic-nt-control', port: 1024, username: 'admin1' } },
        power: 'on', shutter: false, input: 'HDMI 1', testPattern: { enabled: false, type: 'grid' },
        telemetry: { temperatureC: 40, lampHours: 100, brightness: 85 }, errors: [], connection: 'connected', log: [],
        lens: { position: { shiftX: 0, shiftY: 0, zoom: 75, focus: 70 }, presets: [null, null, null, null], activePreset: null },
      }],
    })
    const s = parseProjectFile(old)
    expect(s.project).toEqual({ id: 'proj-1', name: 'Old Show', createdAt: '2026-09-29' })
    expect(s.booths).toEqual([{ id: 'booth-a', name: 'Main Stage' }])
    expect(s.projectors[0]).toMatchObject({ id: 'PJ-01', boothId: 'booth-a', name: 'Stage Left', network: { ip: '192.168.1.21', protocol: { type: 'panasonic-nt-control', port: 1024, username: 'admin1' } } })
    expect(s.projectors[0]!.osd).toBeUndefined() // thiếu = OSD bật như trước
    expect('location' in s.projectors[0]!).toBe(false) // location của máy đã bỏ từ 0.4
  })
})

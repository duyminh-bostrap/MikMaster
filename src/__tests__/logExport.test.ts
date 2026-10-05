import { describe, expect, test } from 'vitest'
import { collectLog, formatLog, logFileName, slug, stamp } from '@/utils/logExport'
import { createProjector } from '@/utils/projector'
import type { Projector } from '@/types'

const proj = (id: string, name: string, log: Projector['log']): Projector => ({ ...createProjector({ id, boothId: 'b', name, ip: `10.0.0.${id.slice(-1)}` }), log })
const e = (id: string, at: string, level: 'info' | 'warn' | 'error', message: string) => ({ id, at, level, message })

describe('xuất log ra file', () => {
  const a = proj('PJ-1', 'Stage Left', [e('2', '2026-10-01T10:05:00.000Z', 'error', 'Connection lost'), e('1', '2026-10-01T10:00:00.000Z', 'info', 'Power on')])
  const b = proj('PJ-2', 'Center/Fill', [e('3', '2026-10-01T10:02:00.000Z', 'warn', 'Temperature 41°C')])

  test('collectLog: gộp mọi máy, cũ nhất trước', () => {
    expect(collectLog([a, b]).map(l => l.entry.id)).toEqual(['1', '3', '2'])
  })

  test('formatLog: đầu file ghi project, phạm vi, số dòng; mỗi dòng có thời gian, mức, máy, nội dung', () => {
    const text = formatLog({ projectName: 'Show', scope: 'all projectors (2)', lines: collectLog([a, b]), exportedAt: new Date('2026-10-01T11:00:00.000Z') })
    expect(text.split('\n').slice(0, 5)).toEqual(['MikMaster log', 'Project : Show', 'Scope   : all projectors (2)', 'Exported: 2026-10-01T11:00:00.000Z', 'Entries : 3'])
    expect(text).toContain('2026-10-01T10:00:00.000Z  INFO   PJ-1 Stage Left (10.0.0.1)  Power on')
    expect(text).toContain('2026-10-01T10:02:00.000Z  WARN   PJ-2 Center/Fill (10.0.0.2)  Temperature 41°C')
    expect(text).toContain('2026-10-01T10:05:00.000Z  ERROR  PJ-1 Stage Left (10.0.0.1)  Connection lost')
    expect(text.indexOf('Power on')).toBeLessThan(text.indexOf('Connection lost'))
    expect(text.endsWith('\n')).toBe(true)
  })

  test('tên file: tổng và riêng từng máy, không có ký tự cấm', () => {
    const when = new Date(2026, 9, 1, 9, 5)
    expect(stamp(when)).toBe('20261001-0905')
    expect(logFileName('My Show: 2026', when)).toBe('mikmaster-log-My-Show-2026-all-20261001-0905.log')
    expect(logFileName('Show', when, b)).toBe('mikmaster-log-Show-PJ-2-CenterFill-20261001-0905.log')
    expect(slug('///', 'x')).toBe('x')
  })
})

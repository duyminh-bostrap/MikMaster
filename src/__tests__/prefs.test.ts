import { beforeEach, describe, expect, test, vi } from 'vitest'
import { DEFAULT_PREFS, getPrefs, parsePrefs, resetPrefs, setPref } from '@/services/prefs'

/** Môi trường test là node (không có localStorage): dựng bản giả tối thiểu. */
function stubStorage(): Map<string, string> {
  const m = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() })
  return m
}

describe('prefs (tuỳ chọn giao diện nhớ cho lần sau)', () => {
  let store: Map<string, string>
  beforeEach(() => { store = stubStorage(); resetPrefs() })

  test('không có dữ liệu / dữ liệu lạ → mặc định', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS)
    expect(parsePrefs('abc')).toEqual(DEFAULT_PREFS)
    expect(parsePrefs({ statusFilter: 'nope', logFilter: 5, testPattern: 'x', terminalOpen: 'yes', terminalTab: 1, scanRange: { from: 'a', to: 'b' }, lastGroup: [] })).toEqual(DEFAULT_PREFS)
  })

  test('giữ giá trị hợp lệ từng trường, bỏ trường hỏng', () => {
    expect(parsePrefs({ sidebarCollapsed: true }).sidebarCollapsed).toBe(true)
    expect(parsePrefs({ sidebarCollapsed: 'yes' }).sidebarCollapsed).toBe(false)
    const p = parsePrefs({ statusFilter: 'alerts', logFilter: 'errors', terminalOpen: true, terminalTab: 'raw', scanRange: { from: '10.0.0.1', to: '10.0.0.50' }, lastGroup: { p1: 'booth-2', p2: 7 }, testPattern: 'bogus' })
    expect(p).toMatchObject({ statusFilter: 'alerts', logFilter: 'errors', terminalOpen: true, terminalTab: 'raw', scanRange: { from: '10.0.0.1', to: '10.0.0.50' }, lastGroup: { p1: 'booth-2' }, testPattern: 'grid' })
  })

  test('setPref ghi vào localStorage và đọc lại được sau khi tải lại', () => {
    setPref('statusFilter', 'offline')
    setPref('scanRange', { from: '10.1.0.1', to: '10.1.0.9' })
    expect(getPrefs().statusFilter).toBe('offline')
    const saved = JSON.parse(store.get('mikmaster.prefs.v1')!)
    expect(parsePrefs(saved)).toMatchObject({ statusFilter: 'offline', scanRange: { from: '10.1.0.1', to: '10.1.0.9' } })
  })
})

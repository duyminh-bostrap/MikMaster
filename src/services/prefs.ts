import { useCallback, useSyncExternalStore } from 'react'
import { TEST_PATTERNS } from '@/constants/testPatterns'
import { STATUS_FILTERS, type StatusFilter } from '@/utils/projectorFilter'
import type { LogFilter } from '@/utils/monitor'
import type { TestPatternType } from '@/types'

/**
 * Tuỳ chọn giao diện nhớ cho lần dùng sau (lưu trong trình duyệt, mỗi máy một bộ, không đi theo project):
 * lọc trạng thái, lọc nhật ký, mẫu test pattern chọn sẵn, ngăn Terminal (mở / thẻ), dải IP quét, group đang xem của từng project.
 * Cài đặt chung (giao diện sáng / tối, ngôn ngữ, độ trễ bật máy) nằm ở `settings.ts`; cách xem tab All + group thu gọn ở `dashboardView.ts`.
 */
export interface Prefs {
  statusFilter: StatusFilter
  logFilter: LogFilter
  testPattern: TestPatternType
  terminalOpen: boolean
  terminalTab: 'log' | 'raw'
  scanRange: { from: string; to: string }
  /** id project → id group đang xem (tab All = không có mục). */
  lastGroup: Record<string, string>
}

export const DEFAULT_PREFS: Prefs = {
  statusFilter: 'all',
  logFilter: 'issues',
  testPattern: 'grid',
  terminalOpen: false,
  terminalTab: 'log',
  scanRange: { from: '192.168.1.1', to: '192.168.1.254' },
  lastGroup: {},
}

const KEY = 'mikmaster.prefs.v1'
const IPV4 = /^(\d{1,3})(\.\d{1,3}){3}$/
const isStr = (v: unknown): v is string => typeof v === 'string'

/** Đọc từng trường có kiểm tra; trường hỏng / lạ → mặc định (không để dữ liệu cũ làm hỏng giao diện). */
export function parsePrefs(raw: unknown): Prefs {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const d = DEFAULT_PREFS
  const range = o.scanRange as { from?: unknown; to?: unknown } | undefined
  const last = o.lastGroup
  return {
    statusFilter: STATUS_FILTERS.includes(o.statusFilter as StatusFilter) ? (o.statusFilter as StatusFilter) : d.statusFilter,
    logFilter: o.logFilter === 'all' || o.logFilter === 'errors' || o.logFilter === 'issues' ? o.logFilter : d.logFilter,
    testPattern: TEST_PATTERNS.some(p => p.type === o.testPattern) ? (o.testPattern as TestPatternType) : d.testPattern,
    terminalOpen: typeof o.terminalOpen === 'boolean' ? o.terminalOpen : d.terminalOpen,
    terminalTab: o.terminalTab === 'raw' ? 'raw' : 'log',
    scanRange: isStr(range?.from) && isStr(range?.to) && IPV4.test(range.from) && IPV4.test(range.to) ? { from: range.from, to: range.to } : d.scanRange,
    lastGroup: typeof last === 'object' && last !== null && !Array.isArray(last)
      ? Object.fromEntries(Object.entries(last as Record<string, unknown>).filter(([k, v]) => isStr(v) && k.length < 100).slice(-50) as [string, string][])
      : d.lastGroup,
  }
}

function read(): Prefs {
  try { const raw = localStorage.getItem(KEY); return parsePrefs(raw ? JSON.parse(raw) : null) } catch { return DEFAULT_PREFS }
}

let current = read()
const listeners = new Set<() => void>()

export const getPrefs = (): Prefs => current

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  if (JSON.stringify(current[key]) === JSON.stringify(value)) return
  current = { ...current, [key]: value }
  try { localStorage.setItem(KEY, JSON.stringify(current)) } catch { /* chỉ giữ trong phiên */ }
  listeners.forEach(l => l())
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

/** Như useState nhưng giá trị được nhớ cho lần sau. */
export function usePref<K extends keyof Prefs>(key: K): [Prefs[K], (v: Prefs[K]) => void] {
  const value = useSyncExternalStore(subscribe, () => current[key])
  return [value, useCallback((v: Prefs[K]) => setPref(key, v), [key])]
}

/** Chỉ để test. */
export function resetPrefs(): void { current = DEFAULT_PREFS; listeners.forEach(l => l()) }

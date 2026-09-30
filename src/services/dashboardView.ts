import { useSyncExternalStore } from 'react'

/** Cách xem tab All của Dashboard + các group đang thu gọn — lưu trong trình duyệt (mỗi máy một bộ), không đi theo project. */
export type AllView = 'groups' | 'map'

export interface DashboardView {
  view: AllView
  /** id các group đang thu gọn (view Group). */
  collapsed: string[]
}

const KEY = 'mikmaster.dashboard-view.v1'

function read(): DashboardView {
  const base: DashboardView = { view: 'groups', collapsed: [] }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const s = JSON.parse(raw) as Partial<DashboardView>
    return {
      view: s.view === 'map' ? 'map' : 'groups',
      collapsed: Array.isArray(s.collapsed) ? s.collapsed.filter((x): x is string => typeof x === 'string') : [],
    }
  } catch { return base }
}

let current = read()
const listeners = new Set<() => void>()

function update(patch: Partial<DashboardView>): void {
  current = { ...current, ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(current)) } catch { /* chỉ giữ trong phiên */ }
  listeners.forEach(l => l())
}

export const setAllView = (view: AllView) => update({ view })
export const toggleGroupCollapsed = (id: string) => update({ collapsed: current.collapsed.includes(id) ? current.collapsed.filter(x => x !== id) : [...current.collapsed, id] })
export const setCollapsedGroups = (ids: string[]) => update({ collapsed: ids })

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
export const useDashboardView = (): DashboardView => useSyncExternalStore(subscribe, () => current, () => current)

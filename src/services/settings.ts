import { useSyncExternalStore } from 'react'

/** Cài đặt của người dùng — lưu trong trình duyệt (mỗi máy một bộ), không đi theo project. */
export type ThemeSetting = 'dark' | 'light' | 'system'
export type Language = 'en' | 'vi'

export interface Settings {
  theme: ThemeSetting
  language: Language
  /** Giây giữa hai lần bật máy khi bật nhiều máy (tránh sụt điện). 0 = bật cùng lúc. */
  powerOnDelaySec: number
}

export const POWER_ON_DELAY_LIMITS = { min: 0, max: 60 } as const
const KEY = 'mikmaster.settings.v1'

function defaults(): Settings {
  const vi = typeof navigator !== 'undefined' && /^vi\b/i.test(navigator.language)
  return { theme: 'dark', language: vi ? 'vi' : 'en', powerOnDelaySec: 5 }
}

function read(): Settings {
  const base = defaults()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const s = JSON.parse(raw) as Partial<Settings>
    return {
      theme: s.theme === 'light' || s.theme === 'system' || s.theme === 'dark' ? s.theme : base.theme,
      language: s.language === 'vi' || s.language === 'en' ? s.language : base.language,
      powerOnDelaySec: clampDelay(s.powerOnDelaySec ?? base.powerOnDelaySec),
    }
  } catch {
    return base
  }
}

export function clampDelay(v: number): number {
  const n = Number.isFinite(v) ? Math.round(v) : 5
  return Math.min(POWER_ON_DELAY_LIMITS.max, Math.max(POWER_ON_DELAY_LIMITS.min, n))
}

let current: Settings = read()
const listeners = new Set<() => void>()

export function getSettings(): Settings {
  return current
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch, ...(patch.powerOnDelaySec !== undefined ? { powerOnDelaySec: clampDelay(patch.powerOnDelaySec) } : {}) }
  try { localStorage.setItem(KEY, JSON.stringify(current)) } catch { /* chỉ giữ trong phiên */ }
  listeners.forEach(l => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings)
}

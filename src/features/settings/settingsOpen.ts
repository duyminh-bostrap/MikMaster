import { useSyncExternalStore } from 'react'

let open = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

export const openSettings = () => { open = true; emit() }
export const closeSettings = () => { open = false; emit() }
export function useSettingsOpen(): boolean {
  return useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l) }, () => open, () => open)
}

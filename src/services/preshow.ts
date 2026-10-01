import { useSyncExternalStore } from 'react'

/**
 * Máy nào đang được xem ở chế độ Pre-Show (xem ảnh cả khi máy đang tắt — Panasonic). Chỉ trong phiên làm việc:
 * Pre-Show là cài đặt của máy chiếu nên không tự bật lại sau khi tải lại trang; gateway trả máy về như cũ khi hết người xem.
 */
const ids = new Set<string>()
const listeners = new Set<() => void>()
let version = 0

export function setPreshowWanted(id: string, on: boolean): void {
  if (on === ids.has(id)) return
  if (on) ids.add(id); else ids.delete(id)
  version++
  listeners.forEach(l => l())
}
export const preshowWanted = (id: string): boolean => ids.has(id)
export function usePreshowWanted(id: string): boolean {
  useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => version)
  return ids.has(id)
}

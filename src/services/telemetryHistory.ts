import { useSyncExternalStore } from 'react'
import type { Projector } from '@/types'

/**
 * Lịch sử nhiệt độ của từng máy (chỉ trong bộ nhớ, mất khi tải lại trang) để vẽ biểu đồ ở view Dashboard.
 * Lấy mẫu mỗi MIN_GAP_MS cho mỗi máy; giữ MAX_AGE_MS gần nhất.
 */
export interface Sample { t: number; c: number }

export const MAX_AGE_MS = 60 * 60_000
export const MIN_GAP_MS = 10_000

const history = new Map<string, Sample[]>()
let version = 0
const listeners = new Set<() => void>()
const emit = () => { version++; listeners.forEach(l => l()) }

/** Ghi nhiệt độ hiện tại của các máy đang kết nối và có số đo (>0). Trả `true` nếu có mẫu mới. */
export function recordTemperatures(projectors: Projector[], now: number = Date.now()): boolean {
  let changed = false
  for (const p of projectors) {
    const c = p.telemetry.temperatureC
    if (p.connection !== 'connected' || !(c > 0)) continue
    const samples = history.get(p.id) ?? []
    const last = samples[samples.length - 1]
    if (last && now - last.t < MIN_GAP_MS) continue
    samples.push({ t: now, c })
    while (samples.length > 0 && now - samples[0]!.t > MAX_AGE_MS) samples.shift()
    history.set(p.id, samples)
    changed = true
  }
  if (changed) emit()
  return changed
}

export const historyOf = (id: string): readonly Sample[] => history.get(id) ?? []

/** Xoá toàn bộ (đổi / đóng project). */
export function clearHistory(): void { if (history.size > 0) { history.clear(); emit() } }

/** Render lại khi có mẫu mới. */
export const useHistoryVersion = (): number => useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => version)

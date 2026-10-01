import { useSyncExternalStore } from 'react'
import type { Projector } from '@/types'

/**
 * Lịch sử cho biểu đồ ở view Dashboard (chỉ trong bộ nhớ, mất khi tải lại trang hoặc đổi project):
 *   - mẫu nhiệt độ của từng máy, CHỈ trong lúc máy bật (mỗi MIN_GAP_MS một mẫu);
 *   - các lần BẬT / TẮT của từng máy (lúc app xác nhận máy chuyển trạng thái).
 * Giữ MAX_AGE_MS gần nhất.
 */
export interface Sample { t: number; c: number }
/** `lost`: hết bật vì MẤT KẾT NỐI (không phải tắt máy). */
export interface PowerEvent { t: number; on: boolean; lost?: boolean }

export const MAX_AGE_MS = 24 * 60 * 60_000
export const MIN_GAP_MS = 10_000

const samples = new Map<string, Sample[]>()
const events = new Map<string, PowerEvent[]>()
let version = 0
const listeners = new Set<() => void>()
const emit = () => { version++; listeners.forEach(l => l()) }

const isOn = (p: Projector) => p.power === 'on' && p.connection === 'connected'

function trim<T extends { t: number }>(list: T[], now: number): void {
  while (list.length > 0 && now - list[0]!.t > MAX_AGE_MS) list.shift()
}

/**
 * Ghi trạng thái hiện tại: máy chuyển sang bật → sự kiện BẬT (mốc = lúc app thấy máy bật, `poweredOnAt`), máy hết bật (tắt / chờ /
 * mất kết nối) → sự kiện TẮT; máy đang bật có số đo → một mẫu nhiệt độ. Trả `true` nếu có ghi mới.
 */
export function recordTelemetry(projectors: Projector[], now: number = Date.now()): boolean {
  let changed = false
  for (const p of projectors) {
    const ev = events.get(p.id) ?? []
    const last = ev[ev.length - 1]
    const on = isOn(p)
    if (on && !last?.on) { ev.push({ t: Math.min(now, p.poweredOnAt ?? now), on: true }); changed = true }
    else if (!on && last?.on) { ev.push({ t: now, on: false, ...(p.connection !== 'connected' ? { lost: true } : {}) }); changed = true }
    trim(ev, now)
    if (ev.length > 0) events.set(p.id, ev)

    const c = p.telemetry.temperatureC
    if (!on || !(c > 0)) continue
    const list = samples.get(p.id) ?? []
    const prev = list[list.length - 1]
    if (prev && now - prev.t < MIN_GAP_MS) continue
    list.push({ t: now, c })
    trim(list, now)
    samples.set(p.id, list)
    changed = true
  }
  if (changed) emit()
  return changed
}

export const historyOf = (id: string): readonly Sample[] => samples.get(id) ?? []
export const eventsOf = (id: string): readonly PowerEvent[] => events.get(id) ?? []

/** Xoá toàn bộ (đổi / đóng project). */
export function clearHistory(): void { if (samples.size > 0 || events.size > 0) { samples.clear(); events.clear(); emit() } }

/** Render lại khi có ghi mới. */
export const useHistoryVersion = (): number => useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => version)

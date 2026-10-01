import { useSyncExternalStore } from 'react'
import type { Projector } from '@/types'

/**
 * Lịch sử cho biểu đồ ở view Dashboard (chỉ trong bộ nhớ, mất khi tải lại trang hoặc đổi project):
 *   - mẫu của từng máy mỗi lần cập nhật (cách nhau ≥ MIN_GAP_MS): nhiệt độ khi máy bật, hoặc mẫu "tắt" (`off`) khi máy tắt / chờ;
 *     MẤT KẾT NỐI thì không có mẫu (đường biểu đồ đứt quãng);
 *   - các lần BẬT / TẮT của từng máy (lúc app xác nhận máy chuyển trạng thái).
 * Giữ MAX_AGE_MS gần nhất.
 */
export interface Sample { t: number; c: number; /** máy đang kết nối nhưng tắt / chờ: c = 0, vẽ ở đáy trục */ off?: true }
/** `lost`: hết bật vì MẤT KẾT NỐI (không phải tắt máy). */
export interface PowerEvent { t: number; on: boolean; lost?: boolean }

export const MAX_AGE_MS = 24 * 60 * 60_000
export const MIN_GAP_MS = 3_000
/** Mẫu cũ hơn FULL_MS được thưa bớt (≥ THIN_GAP_MS giữa hai mẫu) để bộ nhớ không phình ra. */
export const FULL_MS = 60 * 60_000
export const THIN_GAP_MS = 30_000

const samples = new Map<string, Sample[]>()
const events = new Map<string, PowerEvent[]>()
let version = 0
const listeners = new Set<() => void>()
const emit = () => { version++; listeners.forEach(l => l()) }

const isOn = (p: Projector) => p.power === 'on' && p.connection === 'connected'
/** Chỉ để test. */
export const _thin = thin

function trim<T extends { t: number }>(list: T[], now: number): void {
  while (list.length > 0 && now - list[0]!.t > MAX_AGE_MS) list.shift()
}

/** Thưa các mẫu cũ hơn FULL_MS; giữ nguyên chỗ máy đổi giữa bật / tắt. */
function thin(list: Sample[], now: number): void {
  let kept = 0
  for (let i = 0; i < list.length; i++) {
    const s = list[i]!
    const prev = list[kept - 1]
    const old = now - s.t > FULL_MS
    if (!old || !prev || s.t - prev.t >= THIN_GAP_MS || !!s.off !== !!prev.off) list[kept++] = s
  }
  list.length = kept
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

    if (p.connection !== 'connected') continue // mất kết nối: không có mẫu
    const c = p.telemetry.temperatureC
    const sample: Sample | null = on ? (c > 0 ? { t: now, c } : null) : { t: now, c: 0, off: true }
    if (!sample) continue
    const list = samples.get(p.id) ?? []
    const prev = list[list.length - 1]
    if (prev && now - prev.t < MIN_GAP_MS) continue
    list.push(sample)
    trim(list, now)
    if (list.length % 200 === 0) thin(list, now)
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

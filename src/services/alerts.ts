import { useSyncExternalStore } from 'react'
import type { Projector } from '@/types'
import { TEMP_DANGER } from '@/utils/tones'

/**
 * Cảnh báo nhiệt độ cao: khi một máy đang kết nối vượt TEMP_DANGER (40°C) thì đưa vào hàng chờ để hiện pop-up MỘT lần.
 * Máy phải nguội xuống dưới TEMP_DANGER − RE_ARM_MARGIN mới được cảnh báo lại (tránh pop-up liên tục khi nhiệt độ dao động quanh ngưỡng).
 */
export interface HotAlert { projectorId: string; name: string; ip: string; tempC: number; at: number }

export const RE_ARM_MARGIN = 2

const alerted = new Set<string>()
let queue: HotAlert[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

/** Kiểm tra sau mỗi lần cập nhật trạng thái; trả về các cảnh báo mới. */
export function checkHighTemperature(projectors: Projector[], now: number = Date.now()): HotAlert[] {
  const fresh: HotAlert[] = []
  for (const p of projectors) {
    const c = p.telemetry.temperatureC
    if (p.connection === 'connected' && c > TEMP_DANGER) {
      if (!alerted.has(p.id)) {
        alerted.add(p.id)
        fresh.push({ projectorId: p.id, name: p.name, ip: p.network.ip, tempC: c, at: now })
      }
    } else if (c <= TEMP_DANGER - RE_ARM_MARGIN) {
      alerted.delete(p.id)
    }
  }
  if (fresh.length > 0) { queue = [...queue.filter(q => !fresh.some(f => f.projectorId === q.projectorId)), ...fresh]; emit() }
  return fresh
}

export function dismissAlerts(): void { if (queue.length > 0) { queue = []; emit() } }
/** Đổi / đóng project: xoá hàng chờ và trạng thái "đã cảnh báo". */
export function resetAlerts(): void { alerted.clear(); dismissAlerts() }

export const useHotAlerts = (): readonly HotAlert[] => useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => queue)

import type { Projector } from '@/types'

export interface FleetStats {
  total: number
  online: number
  alerts: number
  /** Nhiệt độ trung bình của các máy đang không tắt; 0 nếu không có máy nào. */
  avgTemp: number
  hottest: Projector | null
}

export function computeFleetStats(projectors: Projector[]): FleetStats {
  // Nhiệt độ 0 = thiết bị không báo (ví dụ PJLink không có trường này) → không đưa vào thống kê.
  const active = projectors.filter(p => p.power !== 'off' && p.telemetry.temperatureC > 0)
  const avgTemp = active.length
    ? Math.round(active.reduce((sum, p) => sum + p.telemetry.temperatureC, 0) / active.length)
    : 0
  const hottest = projectors.reduce<Projector | null>(
    (best, p) => (p.telemetry.temperatureC > (best?.telemetry.temperatureC ?? 0) ? p : best),
    null,
  )
  return {
    total: projectors.length,
    online: projectors.filter(p => p.power === 'on' && p.connection === 'connected').length,
    alerts: projectors.filter(p => p.errors.length > 0).length,
    avgTemp,
    hottest,
  }
}

/** Thời gian (ms) của máy đang bật lâu nhất kể từ lúc bật; 0 nếu không máy nào đang bật. Tách riêng vì phụ thuộc đồng hồ. */
export function longestOnMs(projectors: Projector[], now: number): number {
  return projectors.reduce((max, p) => (p.power === 'on' && p.poweredOnAt !== undefined ? Math.max(max, now - p.poweredOnAt) : max), 0)
}

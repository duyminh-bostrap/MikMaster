import type { Projector } from '@/types'

export interface FleetStats {
  total: number
  online: number
  alerts: number
  /** Nhiệt độ trung bình của các máy đang không tắt; 0 nếu không có máy nào. */
  avgTemp: number
  hottest: Projector | null
  totalLampHours: number
}

export function computeFleetStats(projectors: Projector[]): FleetStats {
  const active = projectors.filter(p => p.power !== 'off')
  const avgTemp = active.length
    ? Math.round(active.reduce((sum, p) => sum + p.telemetry.temperatureC, 0) / active.length)
    : 0
  const hottest = projectors.reduce<Projector | null>(
    (best, p) => (!best || p.telemetry.temperatureC > best.telemetry.temperatureC ? p : best),
    null,
  )
  return {
    total: projectors.length,
    online: projectors.filter(p => p.power === 'on').length,
    alerts: projectors.filter(p => p.errors.length > 0).length,
    avgTemp,
    hottest,
    totalLampHours: projectors.reduce((sum, p) => sum + p.telemetry.lampHours, 0),
  }
}

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

export interface ConnectionStats {
  total: number
  /** Đang kết nối được với máy. */
  connected: number
  /** Không kết nối được (mất kết nối, lỗi giao thức, cần đăng nhập) = total − connected. */
  disconnected: number
  /** Trong số `disconnected`: máy đang đòi đăng nhập. */
  needLogin: number
  /** Đang kết nối và đã BẬT hẳn. */
  on: number
  /** Đang kết nối, lệnh bật đã gửi thành công / máy báo đang khởi động. */
  warmup: number
  /** Đang kết nối, đang làm nguội sau khi tắt. */
  cooling: number
  /** Đang kết nối và tắt / chờ. (on + warmup + cooling + off = connected) */
  off: number
}

/** Tóm tắt kết nối và bật / tắt cho thanh tóm tắt ở trang All (mỗi máy rơi đúng một nhóm: bật / tắt / không kết nối). */
export function connectionStats(projectors: Projector[]): ConnectionStats {
  const connected = projectors.filter(p => p.connection === 'connected')
  const count = (power: string) => connected.filter(p => p.power === power).length
  const on = count('on'), warmup = count('warmup'), cooling = count('cooling')
  return {
    total: projectors.length,
    connected: connected.length,
    disconnected: projectors.length - connected.length,
    needLogin: projectors.filter(p => p.connection === 'auth-failed').length,
    on,
    warmup,
    cooling,
    off: connected.length - on - warmup - cooling,
  }
}

/** Thời gian (ms) của máy đang bật lâu nhất kể từ lúc bật; 0 nếu không máy nào đang bật. Tách riêng vì phụ thuộc đồng hồ. */
export function longestOnMs(projectors: Projector[], now: number): number {
  return projectors.reduce((max, p) => (p.power === 'on' && p.poweredOnAt !== undefined ? Math.max(max, now - p.poweredOnAt) : max), 0)
}

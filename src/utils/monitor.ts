import type { LogEntry, Projector } from '@/types'
import type { Tone } from '@/utils/tones'

/*
 * Dữ liệu cho các bảng theo dõi của view Dashboard (tab All): mỗi hàm nhận danh sách máy và trả các hàng đã lọc + sắp xếp.
 * Chỉ tính toán, không phụ thuộc giao diện.
 */

export type MonitorStatus = 'login' | 'offline' | 'error' | 'on' | 'standby' | 'off'

/** Trạng thái hiển thị của một máy; `rank` nhỏ = cần chú ý trước. */
export function monitorStatus(p: Projector): { key: MonitorStatus; label: string; tone: Tone; rank: number } {
  if (p.connection === 'auth-failed') return { key: 'login', label: 'LOGIN', tone: 'warn', rank: 0 }
  if (p.connection !== 'connected') return { key: 'offline', label: 'OFFLINE', tone: 'danger', rank: 1 }
  if (p.errors.length > 0) return { key: 'error', label: 'ERROR', tone: 'danger', rank: 2 }
  if (p.power === 'on') return { key: 'on', label: 'ON', tone: 'ok', rank: 3 }
  if (p.power === 'standby') return { key: 'standby', label: 'STANDBY', tone: 'warn', rank: 4 }
  return { key: 'off', label: 'OFF', tone: 'off', rank: 5 }
}

const byName = (a: Projector, b: Projector) => a.name.localeCompare(b.name, undefined, { numeric: true })

/** Máy có số đo nhiệt độ, nóng nhất trước; kèm số máy không báo nhiệt độ. */
export function temperatureRows(ps: Projector[]): { rows: Projector[]; missing: number; avg: number; max: number } {
  const rows = ps.filter(p => p.telemetry.temperatureC > 0).sort((a, b) => b.telemetry.temperatureC - a.telemetry.temperatureC || byName(a, b))
  const temps = rows.map(p => p.telemetry.temperatureC)
  return { rows, missing: ps.length - rows.length, avg: temps.length ? Math.round(temps.reduce((s, n) => s + n, 0) / temps.length) : 0, max: temps.length ? Math.max(...temps) : 0 }
}

/** Máy đang bật, sáng nhất trước; kèm số máy không bật (không có độ sáng). */
export function brightnessRows(ps: Projector[]): { rows: Projector[]; off: number; avg: number } {
  const rows = ps.filter(p => p.power === 'on').sort((a, b) => b.telemetry.brightness - a.telemetry.brightness || byName(a, b))
  return { rows, off: ps.length - rows.length, avg: rows.length ? Math.round(rows.reduce((s, p) => s + p.telemetry.brightness, 0) / rows.length) : 0 }
}

/** Máy đang bật và app biết lúc bật, bật lâu nhất trước (ms tính từ lúc bật bằng phần mềm). */
export function onTimeRows(ps: Projector[], now: number): { rows: { projector: Projector; ms: number; since: number }[]; off: number; longest: number } {
  const rows = ps
    .filter(p => p.power === 'on' && p.poweredOnAt !== undefined)
    .map(p => ({ projector: p, since: p.poweredOnAt!, ms: Math.max(0, now - p.poweredOnAt!) }))
    .sort((a, b) => b.ms - a.ms || byName(a.projector, b.projector))
  return { rows, off: ps.length - rows.length, longest: rows[0]?.ms ?? 0 }
}

/** Mọi máy, máy cần chú ý (đăng nhập, mất kết nối, lỗi) trước. */
export function statusRows(ps: Projector[]): { rows: Projector[]; counts: Record<MonitorStatus, number> } {
  const counts: Record<MonitorStatus, number> = { login: 0, offline: 0, error: 0, on: 0, standby: 0, off: 0 }
  for (const p of ps) counts[monitorStatus(p).key]++
  const rows = [...ps].sort((a, b) => monitorStatus(a).rank - monitorStatus(b).rank || byName(a, b))
  return { rows, counts }
}

export type LogFilter = 'all' | 'issues' | 'errors'
export interface LogRow { projector: Projector; entry: LogEntry }

/** Nhật ký gộp của mọi máy, mới nhất trước. `issues` = cảnh báo + lỗi, `errors` = chỉ lỗi. */
export function logRows(ps: Projector[], filter: LogFilter, limit = 60): LogRow[] {
  const keep = (e: LogEntry) => filter === 'all' || (filter === 'issues' ? e.level !== 'info' : e.level === 'error')
  return ps.flatMap(projector => projector.log.filter(keep).map(entry => ({ projector, entry })))
    .sort((a, b) => b.entry.at.localeCompare(a.entry.at))
    .slice(0, limit)
}

/** Lỗi đang có (Projector.errors) theo máy. */
export function activeErrors(ps: Projector[]): { projector: Projector; errors: string[] }[] {
  return ps.filter(p => p.errors.length > 0).map(projector => ({ projector, errors: projector.errors })).sort((a, b) => byName(a.projector, b.projector))
}

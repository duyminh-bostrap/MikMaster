import type { LogEntry, Projector } from '@/types'

/*
 * Xuất nhật ký ra file văn bản để lưu về máy: một file TỔNG (mọi máy) hoặc một file RIÊNG của từng máy.
 * Dòng log cũ nhất ở trên cùng (đọc từ trên xuống theo thời gian). Chỉ gồm nhật ký app đang giữ (LOG_LIMIT dòng gần nhất mỗi máy).
 */
export interface LogLine { projector: Projector; entry: LogEntry }

const pad = (n: number) => String(n).padStart(2, '0')

/** yyyymmdd-hhmm theo giờ địa phương (cho tên file). */
export function stamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

/** Bỏ ký tự không hợp lệ trong tên file; tên rỗng → `fallback`. */
export function slug(s: string, fallback = 'log'): string {
  const out = s.trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').slice(0, 60)
  return out || fallback
}

/** Gom log của các máy thành danh sách dòng, cũ nhất trước. */
export function collectLog(projectors: Projector[]): LogLine[] {
  return projectors.flatMap(projector => projector.log.map(entry => ({ projector, entry }))).sort((a, b) => a.entry.at.localeCompare(b.entry.at))
}

export function formatLog(opts: { projectName: string; scope: string; lines: LogLine[]; exportedAt: Date }): string {
  const { projectName, scope, lines, exportedAt } = opts
  const header = [
    `MikMaster log`,
    `Project : ${projectName}`,
    `Scope   : ${scope}`,
    `Exported: ${exportedAt.toISOString()}`,
    `Entries : ${lines.length}`,
    '',
  ]
  const body = lines.map(({ projector: p, entry: e }) => `${e.at}  ${e.level.toUpperCase().padEnd(5)}  ${p.id} ${p.name} (${p.network.ip})  ${e.message}`)
  return [...header, ...body, ''].join('\n')
}

/** Tên file: tổng = mikmaster-log-<project>-<thời điểm>.log; riêng một máy thêm mã + tên máy. */
export function logFileName(projectName: string, exportedAt: Date, projector?: Projector): string {
  const base = `mikmaster-log-${slug(projectName, 'project')}`
  return `${base}${projector ? `-${slug(`${projector.id}-${projector.name}`)}` : '-all'}-${stamp(exportedAt)}.log`
}

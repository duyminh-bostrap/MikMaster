import type { Projector } from '@/types'

export type StatusFilter = 'all' | 'on' | 'off' | 'alerts' | 'offline'

export const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'on', 'off', 'alerts', 'offline']

export function matchesStatus(p: Projector, status: StatusFilter): boolean {
  switch (status) {
    case 'all': return true
    case 'on': return p.power === 'on' && p.connection === 'connected'
    case 'off': return p.power !== 'on' && p.connection === 'connected' // tắt / chờ nhưng vẫn kết nối (mất kết nối là mục Offline)
    case 'alerts': return p.errors.length > 0 || p.connection !== 'connected'
    case 'offline': return p.connection !== 'connected'
  }
}

/** Tìm theo tên, mã PJ-xx, IP, model, vị trí, booth; nhiều từ = phải khớp tất cả; không phân biệt hoa thường / dấu. */
export function matchesQuery(p: Projector, query: string, boothName = ''): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const hay = normalize([p.id, p.name, p.network.ip, p.model, boothName, p.network.protocol.type].join(' '))
  return words.every(w => hay.includes(w))
}

export function nextProjectorId(projectors: readonly Projector[]): string {
  const used = new Set(projectors.map(p => p.id))
  let n = projectors.reduce((max, p) => Math.max(max, Number(/^PJ-(\d+)$/.exec(p.id)?.[1] ?? 0)), 0) + 1
  while (used.has(`PJ-${String(n).padStart(2, '0')}`)) n++
  return `PJ-${String(n).padStart(2, '0')}`
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
}

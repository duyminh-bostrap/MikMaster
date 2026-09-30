import type { Booth, Projector } from '@/types'

/*
 * Sơ đồ 2D của tab All: một mặt phẳng cố định (pixel ảo) chứa các máy chiếu; người dùng kéo để đặt đúng vị trí thật.
 * Vị trí (góc trên trái của ô) lưu trong `Projector.mapPos` và đi theo project. Máy chưa có vị trí được xếp tự động:
 * mỗi group một dải, các dải xếp từ trên xuống.
 */
export const MAP = { width: 1200, nodeW: 184, nodeH: 148, gap: 16, pad: 24, minHeight: 480, snap: 8 } as const

export interface Pos { x: number; y: number }

const COLS = Math.floor((MAP.width - 2 * MAP.pad + MAP.gap) / (MAP.nodeW + MAP.gap))

/** Vị trí xếp tự động cho mọi máy (theo thứ tự group), và chiều cao cần thiết. */
export function autoLayout(booths: Booth[], projectors: Projector[]): { pos: Record<string, Pos>; height: number } {
  const pos: Record<string, Pos> = {}
  let y: number = MAP.pad
  const groups = [...booths.map(b => projectors.filter(p => p.boothId === b.id)), projectors.filter(p => !booths.some(b => b.id === p.boothId))]
  for (const items of groups) {
    if (items.length === 0) continue
    items.forEach((p, i) => { pos[p.id] = { x: MAP.pad + (i % COLS) * (MAP.nodeW + MAP.gap), y: y + Math.floor(i / COLS) * (MAP.nodeH + MAP.gap) } })
    y += Math.ceil(items.length / COLS) * (MAP.nodeH + MAP.gap) + MAP.gap * 2
  }
  return { pos, height: y }
}

export const snap = (n: number): number => Math.round(n / MAP.snap) * MAP.snap

/** Giữ ô trong mặt phẳng. */
export function clampPos(p: Pos, height: number): Pos {
  return {
    x: Math.min(MAP.width - MAP.nodeW, Math.max(0, p.x)),
    y: Math.min(height - MAP.nodeH, Math.max(0, p.y)),
  }
}

/** Mặt phẳng đủ chứa mọi ô (kể cả ô người dùng kéo xuống thấp). */
export function canvasHeight(positions: Pos[], autoHeight: number): number {
  const lowest = positions.reduce((m, p) => Math.max(m, p.y + MAP.nodeH + MAP.pad), 0)
  return Math.max(MAP.minHeight, autoHeight, lowest)
}

/** Màu theo thứ tự group (HSL, đủ tách biệt trên nền tối và sáng). */
export const groupHue = (index: number): number => (index * 47 + 200) % 360
export const groupColor = (index: number): string => `hsl(${groupHue(index)} 70% 55%)`

/** Đọc `mapPos` từ file project cũ / lạ: chỉ nhận số hữu hạn trong giới hạn hợp lý. */
export function sanitizeMapPos(v: unknown): Pos | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const { x, y } = v as Record<string, unknown>
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return undefined
  return { x: Math.min(MAP.width - MAP.nodeW, Math.max(0, Math.round(x))), y: Math.min(20_000, Math.max(0, Math.round(y))) }
}

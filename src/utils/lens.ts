import { LENS_LIMITS } from '@/constants/lens'
import type { LensPosition, LensPreset, LensSlot } from '@/types'

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Cộng delta vào vị trí hiện tại và kẹp trong giới hạn cơ khí của ống kính. */
export function applyLensDelta(position: LensPosition, delta: Partial<LensPosition>): LensPosition {
  const { shift, zoom, focus } = LENS_LIMITS
  return {
    shiftX: clamp(position.shiftX + (delta.shiftX ?? 0), shift.min, shift.max),
    shiftY: clamp(position.shiftY + (delta.shiftY ?? 0), shift.min, shift.max),
    zoom: clamp(position.zoom + (delta.zoom ?? 0), zoom.min, zoom.max),
    focus: clamp(position.focus + (delta.focus ?? 0), focus.min, focus.max),
  }
}

export function buildLensPreset(slot: LensSlot, name: string, position: LensPosition): LensPreset {
  return { slot, name, position: { ...position }, savedAt: new Date().toISOString() }
}

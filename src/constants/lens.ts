import type { LensSlot } from '@/types'

export const LENS_LIMITS = {
  shift: { min: -100, max: 100 },
  zoom: { min: 0, max: 100 },
  focus: { min: 0, max: 100 },
} as const

/** Bước chỉnh mỗi lần bấm nút. */
export const LENS_STEP = 5

export const LENS_SLOTS: readonly LensSlot[] = [1, 2, 3, 4]

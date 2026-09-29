export type LensSlot = 1 | 2 | 3 | 4

/** Vị trí ống kính. Shift: -100..100, Zoom/Focus: 0..100 (%). */
export interface LensPosition {
  shiftX: number
  shiftY: number
  zoom: number
  focus: number
}

export interface LensPreset {
  slot: LensSlot
  name: string
  position: LensPosition
  /** ISO 8601 */
  savedAt: string
}

/** Đúng 4 slot; `null` = slot trống. */
export type LensPresetSlots = [
  LensPreset | null,
  LensPreset | null,
  LensPreset | null,
  LensPreset | null,
]

export interface LensState {
  position: LensPosition
  presets: LensPresetSlots
  /** Preset đang được nạp; về `null` khi người dùng chỉnh tay hoặc Unload. */
  activePreset: LensSlot | null
}

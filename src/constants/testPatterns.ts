import type { TestPatternType } from '@/types'

export const TEST_PATTERNS: readonly { type: TestPatternType; label: string }[] = [
  { type: 'grid', label: 'Grid' },
  { type: 'crosshatch', label: 'Crosshatch' },
  { type: 'crosshair', label: 'Crosshair' },
  { type: 'color-bars', label: 'Color Bars' },
  { type: 'gray-ramp', label: 'Gray Ramp' },
  { type: 'focus', label: 'Focus' },
  { type: 'white', label: 'White' },
  { type: 'black', label: 'Black' },
  { type: 'red', label: 'Red' },
  { type: 'green', label: 'Green' },
  { type: 'blue', label: 'Blue' },
]

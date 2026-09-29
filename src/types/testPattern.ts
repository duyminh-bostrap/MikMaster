export type TestPatternType =
  | 'grid'
  | 'crosshatch'
  | 'crosshair'
  | 'color-bars'
  | 'gray-ramp'
  | 'focus'
  | 'white'
  | 'black'
  | 'red'
  | 'green'
  | 'blue'

export interface TestPatternState {
  enabled: boolean
  type: TestPatternType
}

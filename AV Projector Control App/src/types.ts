export interface LensPreset {
  slot: number
  name: string
  shiftX: number
  shiftY: number
  zoom: number
  focus: number
  savedAt: string
}

export interface Projector {
  id: string
  boothId: string
  name: string
  location: string
  ip: string
  power: 'on' | 'off' | 'standby'
  shutter: boolean
  input: string
  temp: number
  lampHours: number
  brightness: number
  errors: string[]
  model?: string
  lensPresets: (LensPreset | null)[]
  activeLensPreset: number | null
  lensShiftX: number
  lensShiftY: number
  lensZoom: number
  lensFocus: number
}

export interface Booth {
  id: string
  name: string
  location: string
}

export interface Project {
  id: string
  name: string
  venue: string
  createdAt: string
}

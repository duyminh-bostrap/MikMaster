import type { LensState } from './lens'
import type { ProtocolConfig } from './protocol'
import type { TestPatternState } from './testPattern'

export type PowerState = 'on' | 'standby' | 'off'

export type InputSource =
  | 'HDMI 1'
  | 'HDMI 2'
  | 'SDI 1'
  | 'SDI 2'
  | 'HDBaseT'
  | 'DisplayPort'
  | 'DVI'

export interface NetworkConfig {
  ip: string
  protocol: ProtocolConfig
}

/** Số liệu đọc về từ thiết bị. */
export interface Telemetry {
  temperatureC: number
  lampHours: number
  /** 0..100 (%) */
  brightness: number
}

/** Trạng thái liên lạc với thiết bị (tách khỏi Power: máy có thể bật nhưng mất kết nối). */
export type ConnectionStatus = 'connected' | 'disconnected' | 'protocol-error'

export interface LogEntry {
  id: string
  /** ISO 8601 */
  at: string
  level: 'info' | 'warn' | 'error'
  message: string
}

export interface Projector {
  id: string
  boothId: string
  name: string
  location: string
  model: string
  network: NetworkConfig
  power: PowerState
  shutter: boolean
  /** Hiển thị OSD (menu trên màn hình). Thiếu = bật (project lưu từ bản cũ). */
  osd?: boolean
  input: InputSource
  testPattern: TestPatternState
  telemetry: Telemetry
  errors: string[]
  connection: ConnectionStatus
  log: LogEntry[]
  lens: LensState
}

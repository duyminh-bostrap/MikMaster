import type { LensState } from './lens'
import type { ProtocolConfig } from './protocol'
import type { TestPatternState } from './testPattern'

/**
 * on / standby / off + hai giai đoạn chuyển tiếp của máy cao cấp:
 *   warmup  = đang khởi động (đã nhận lệnh bật hoặc máy báo warm-up, chưa sáng hẳn)
 *   cooling = đang làm nguội sau khi tắt (chưa về standby)
 */
export type PowerState = 'on' | 'standby' | 'off' | 'warmup' | 'cooling'

/** Lệnh bật / tắt đã gửi thành công, đang chờ máy xác nhận: `from` là trạng thái trước, `at` là lúc gửi. */
export interface PowerPending { to: 'on' | 'standby'; from: PowerState; at: number }

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
  /** Vị trí ống kính máy báo (đơn vị của máy, chỉ đọc) — Christie. */
  lensReading?: { shiftH?: number; shiftV?: number; zoom?: number; focus?: number }
  /** Nhiệt độ từng cảm biến, nếu máy báo (Christie). */
  sensors?: { name: string; c: number }[]
}

/** Trạng thái liên lạc với thiết bị (tách khỏi Power: máy có thể bật nhưng mất kết nối). */
/** `auth-failed`: máy từ chối đăng nhập (sai / thiếu mật khẩu) — khác lỗi mạng và lỗi giao thức. */
export type ConnectionStatus = 'connected' | 'disconnected' | 'protocol-error' | 'auth-failed'

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
  model: string
  network: NetworkConfig
  power: PowerState
  /** Lúc app thấy máy chuyển sang bật (ms epoch); xoá khi máy tắt / standby. Chỉ là trạng thái sống, không tính vào "sửa project". */
  poweredOnAt?: number
  /** Đang chờ máy xác nhận lệnh bật / tắt (chỉ khi có gateway). */
  powerPending?: PowerPending
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

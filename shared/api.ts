/** Hợp đồng HTTP giữa web app và server/. Chỉ chứa type và hằng số, không phụ thuộc gì. */

export type DriverProtocol = 'pjlink-class1' | 'pjlink-class2' | 'panasonic-nt-control' | 'christie-serial-ip'

export type Capability = 'power' | 'shutter' | 'input' | 'osd' | 'raw'

/**
 * Chỉ liệt kê lệnh đã có nguồn tham chiếu. Lens và Test Pattern CHƯA có ở đây
 * vì chưa xác minh được bộ lệnh của RQ35K / Griffyn — xem README mục "Driver".
 */
export const LIVE_CAPABILITIES: Record<DriverProtocol, readonly Capability[]> = {
  'pjlink-class1': ['power', 'shutter', 'input', 'raw'],
  'pjlink-class2': ['power', 'shutter', 'input', 'raw'],
  'panasonic-nt-control': ['power', 'shutter', 'input', 'osd', 'raw'],
  'christie-serial-ip': ['power', 'shutter', 'raw'],
}

export const DEFAULT_PORTS: Record<DriverProtocol, number> = {
  'pjlink-class1': 4352,
  'pjlink-class2': 4352,
  'panasonic-nt-control': 1024,
  'christie-serial-ip': 3002,
}

export function isDriverProtocol(value: string): value is DriverProtocol {
  return value in LIVE_CAPABILITIES
}

export interface TargetDto {
  ip: string
  protocol: { type: string; port: number; username?: string; password?: string }
}

export type OsdKeyDto = 'menu' | 'back' | 'exit' | 'up' | 'down' | 'left' | 'right' | 'enter'

export type CommandDto =
  | { kind: 'power'; value: 'on' | 'standby' | 'off' }
  | { kind: 'shutter'; closed: boolean }
  | { kind: 'input'; input: string }
  | { kind: 'osd'; key: OsdKeyDto }

export interface StatusDto {
  power?: 'on' | 'standby' | 'cooling' | 'warmup'
  shutter?: boolean
  /** Nhãn InputSource của web app nếu ánh xạ được. */
  input?: string
  lampHours?: number
  errors: string[]
}

export type ApiErrorCode =
  | 'connect' | 'timeout' | 'auth' | 'protocol' | 'device' | 'unsupported' | 'bad-request' | 'forbidden-host'

export interface ApiErrorDto {
  error: { code: ApiErrorCode; message: string }
}

export interface ScanFoundDto {
  ip: string
  port: number
  protocol: DriverProtocol
  authRequired: boolean
  name?: string
  manufacturer?: string
  model?: string
}

export interface ScanProgressDto {
  pct: number
  ip: string
}

export interface HealthDto {
  ok: true
  drivers: Record<DriverProtocol, readonly Capability[]>
}

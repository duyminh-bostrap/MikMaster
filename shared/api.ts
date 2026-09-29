/** Hợp đồng HTTP giữa web app và server/. Chỉ chứa type và hằng số, không phụ thuộc gì. */

export type DriverProtocol = 'pjlink-class1' | 'pjlink-class2' | 'panasonic-nt-control' | 'christie-serial-ip' | 'barco-pulse' | 'generic-tcp' | 'generic-udp' | 'art-net' | 'http-api'

export type Capability = 'power' | 'shutter' | 'input' | 'osd' | 'raw' | 'testPattern'

/**
 * Chỉ liệt kê lệnh đã có nguồn tham chiếu. Lens và Test Pattern CHƯA có ở đây
 * vì chưa xác minh được bộ lệnh của RQ35K / Griffyn — xem README mục "Driver".
 */
export const LIVE_CAPABILITIES: Record<DriverProtocol, readonly Capability[]> = {
  'pjlink-class1': ['power', 'shutter', 'input', 'raw'],
  'pjlink-class2': ['power', 'shutter', 'input', 'raw'],
  'panasonic-nt-control': ['power', 'shutter', 'input', 'osd', 'raw'],
  'christie-serial-ip': ['power', 'shutter', 'raw'],
  'barco-pulse': ['power', 'shutter', 'raw'],
  // Chỉ RAW COMMAND: không có lệnh chuẩn nên không poll, không có power/shutter.
  'generic-tcp': ['raw'],
  'generic-udp': ['raw'],
  'art-net': ['raw'],
  'http-api': ['raw'],
}

export const DEFAULT_PORTS: Record<DriverProtocol, number> = {
  'pjlink-class1': 4352,
  'pjlink-class2': 4352,
  'panasonic-nt-control': 1024,
  'christie-serial-ip': 3002,
  'barco-pulse': 9090,
  'generic-tcp': 4000,
  'generic-udp': 5000,
  'art-net': 6454,
  'http-api': 80,
}

export function isDriverProtocol(value: string): value is DriverProtocol {
  return value in LIVE_CAPABILITIES
}

/** Lệnh người dùng tự khai báo cho giao thức chung (cú pháp giống ô RAW COMMAND của giao thức đó). */
export interface CommandTemplates {
  powerOn?: string
  powerOff?: string
  shutterClose?: string
  shutterOpen?: string
  /** Mọi giao thức: lệnh bật / tắt test pattern lấy từ manual của máy (chưa có lệnh hãng đã xác minh). */
  testPatternOn?: string
  testPatternOff?: string
  /**
   * Đọc số liệu thật: lệnh hỏi (gửi qua RAW, chép từ manual) + regex lấy số (nhóm 1; bỏ trống = số cuối cùng trong phản hồi).
   * PJLink không có lệnh nhiệt độ; giờ đèn của PJLink đã đọc sẵn.
   */
  temperatureQuery?: string
  temperatureRegex?: string
  lampHoursQuery?: string
  lampHoursRegex?: string
}

export const TEMPLATE_KEYS = [
  'powerOn', 'powerOff', 'shutterClose', 'shutterOpen', 'testPatternOn', 'testPatternOff',
  'temperatureQuery', 'temperatureRegex', 'lampHoursQuery', 'lampHoursRegex',
] as const satisfies readonly (keyof CommandTemplates)[]

/** Giao thức không có bộ lệnh chuẩn: Power / Shutter chỉ chạy khi người dùng khai báo mẫu lệnh. */
export const TEMPLATE_PROTOCOLS: readonly string[] = ['generic-tcp', 'generic-udp', 'art-net', 'http-api']

/** Mẫu lệnh cần cho một thao tác (power on/off, shutter đóng/mở). */
export function templateKeyFor(command: { kind: string; value?: string; closed?: boolean; enabled?: boolean }): keyof CommandTemplates | null {
  if (command.kind === 'power') return command.value === 'on' ? 'powerOn' : 'powerOff'
  if (command.kind === 'shutter') return command.closed ? 'shutterClose' : 'shutterOpen'
  if (command.kind === 'testPattern') return command.enabled ? 'testPatternOn' : 'testPatternOff'
  return null
}

/** Khả năng thật của một máy: của driver, cộng Power / Shutter nếu giao thức chung đã có đủ mẫu lệnh. */
export function effectiveCapabilities(type: string, commands?: CommandTemplates): readonly Capability[] {
  const base = isDriverProtocol(type) ? LIVE_CAPABILITIES[type] : []
  if (!commands || !base.includes('raw')) return base
  const extra: Capability[] = []
  if (TEMPLATE_PROTOCOLS.includes(type)) {
    if (commands.powerOn && commands.powerOff) extra.push('power')
    if (commands.shutterClose && commands.shutterOpen) extra.push('shutter')
  }
  // Test pattern: mọi giao thức có RAW, khi đã khai báo đủ cặp lệnh bật / tắt.
  if (commands.testPatternOn && commands.testPatternOff) extra.push('testPattern')
  return [...extra, ...base]
}

export interface TargetDto {
  ip: string
  protocol: { type: string; port: number; username?: string; password?: string; commands?: CommandTemplates }
}

export type OsdKeyDto = 'menu' | 'back' | 'exit' | 'up' | 'down' | 'left' | 'right' | 'enter'

export type CommandDto =
  | { kind: 'power'; value: 'on' | 'standby' | 'off' }
  | { kind: 'shutter'; closed: boolean }
  | { kind: 'input'; input: string }
  | { kind: 'osd'; key: OsdKeyDto }
  /** Gửi mẫu lệnh test pattern người dùng khai báo (chưa có lệnh chuẩn của hãng). */
  | { kind: 'testPattern'; enabled: boolean }

export interface StatusDto {
  power?: 'on' | 'standby' | 'cooling' | 'warmup'
  shutter?: boolean
  /** Nhãn InputSource của web app nếu ánh xạ được. */
  input?: string
  lampHours?: number
  /** °C, khi đọc được từ máy. */
  temperatureC?: number
  errors: string[]
}

export type ApiErrorCode =
  | 'connect' | 'timeout' | 'auth' | 'protocol' | 'device' | 'unsupported' | 'bad-request' | 'forbidden-host' | 'unauthorized' | 'not-found'

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

/** Kết quả nhận diện một IP (thêm máy bằng tay). `found: false` = không giao thức nào trả lời. */
export interface IdentifyDto {
  found: boolean
  protocol?: DriverProtocol
  port?: number
  manufacturer?: string
  model?: string
  /** Tên máy do người dùng đặt trên máy chiếu (PJLink NAME), nếu có. */
  name?: string
  authRequired?: boolean
}

export interface ScanProgressDto {
  pct: number
  ip: string
}

export interface HealthDto {
  ok: true
  drivers: Record<DriverProtocol, readonly Capability[]>
  /** Gateway đòi token (bắt buộc khi bind ngoài loopback). */
  authRequired: boolean
  /** Token client gửi kèm (nếu có) có hợp lệ không. */
  authorized: boolean
}

export interface ProjectSummaryDto {
  id: string
  name: string
  /** ISO 8601 */
  savedAt: string
  deviceCount: number
}

/** Hình dạng tối thiểu server cần biết; phần còn lại của project/booth/projector được lưu nguyên. */
export interface ProjectSnapshotDto {
  project: { id: string; name: string; createdAt?: string; [k: string]: unknown }
  booths: unknown[]
  projectors: Array<{ network?: { protocol?: { password?: string; [k: string]: unknown }; [k: string]: unknown }; [k: string]: unknown }>
}

export interface PingResultDto {
  ok: boolean
  /** Độ trễ (ms) khi thành công. */
  ms?: number
  error?: string
}

export interface PingDto {
  /** `null` = gateway không có lệnh ping. */
  icmp: PingResultDto | null
  /** `null` = giao thức UDP (không có cổng TCP để thử). */
  tcp: PingResultDto | null
  port: number
  at: string
}

/** Giao thức dùng UDP: không kiểm tra được cổng bằng kết nối TCP. */
export const UDP_PROTOCOLS: readonly string[] = ['generic-udp', 'art-net']

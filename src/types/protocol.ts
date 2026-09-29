import type { CommandTemplates } from '../../shared/api.ts'

/** Giao thức điều khiển máy chiếu qua mạng. */
export type ProtocolType =
  | 'pjlink-class1'
  | 'pjlink-class2'
  | 'christie-serial-ip'
  | 'barco-xlm'
  | 'epson-escvp21'
  | 'sony-sdcp'
  | 'panasonic-nt-control'
  | 'generic-tcp'
  | 'generic-udp'
  | 'art-net'
  | 'http-api'

export interface ProtocolConfig {
  type: ProtocolType
  port: number
  /** Mật khẩu xác thực (PJLink dùng MD5 challenge). Bỏ trống nếu thiết bị không yêu cầu. */
  username?: string
  password?: string
  /** Giao thức chung: lệnh tự khai báo cho Power / Shutter. */
  commands?: CommandTemplates
}

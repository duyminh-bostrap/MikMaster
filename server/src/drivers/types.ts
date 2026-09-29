import type { CommandDto, CommandTemplates, ScanFoundDto, StatusDto } from '../../../shared/api.ts'

export interface DriverTarget {
  host: string
  port: number
  username?: string
  password?: string
  timeoutMs: number
  /** Giao thức chung: lệnh người dùng khai báo cho power / shutter. */
  commands?: CommandTemplates
}

export type ProbeResult = Omit<ScanFoundDto, 'ip' | 'port' | 'protocol'>

export interface Driver {
  status(target: DriverTarget): Promise<StatusDto>
  command(target: DriverTarget, command: CommandDto): Promise<void>
  /** Gửi nguyên văn một lệnh của hãng và trả phản hồi thô — để kiểm tra/khám phá lệnh trên máy thật. */
  raw(target: DriverTarget, text: string): Promise<string>
  /** Dùng khi quét mạng: trả `null` nếu cổng này không phải thiết bị của driver. */
  probe(host: string, port: number, timeoutMs: number): Promise<ProbeResult | null>
}

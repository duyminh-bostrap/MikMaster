import type { ProtocolConfig, ProtocolType } from '@/types'

export interface ProtocolOption {
  type: ProtocolType
  label: string
  defaultPort: number
  auth: string
  transport: 'TCP' | 'UDP' | 'HTTP'
}

export const PROTOCOL_OPTIONS: readonly ProtocolOption[] = [
  { type: 'pjlink-class2', label: 'PJLink Class 2', defaultPort: 4352, auth: 'MD5 Challenge', transport: 'TCP' },
  { type: 'pjlink-class1', label: 'PJLink Class 1', defaultPort: 4352, auth: 'MD5 Challenge', transport: 'TCP' },
  { type: 'christie-serial-ip', label: 'Christie Serial-over-IP', defaultPort: 3002, auth: 'None', transport: 'TCP' },
  { type: 'barco-pulse', label: 'Barco Pulse (JSON-RPC)', defaultPort: 9090, auth: 'None', transport: 'TCP' },
  { type: 'barco-xlm', label: 'Barco XLM', defaultPort: 1025, auth: 'None', transport: 'TCP' },
  { type: 'epson-escvp21', label: 'Epson ESC/VP.net', defaultPort: 3629, auth: 'Password', transport: 'TCP' },
  { type: 'sony-sdcp', label: 'Sony SDCP', defaultPort: 53484, auth: 'None', transport: 'TCP' },
  { type: 'generic-tcp', label: 'Generic TCP/IP', defaultPort: 4000, auth: 'None', transport: 'TCP' },
  { type: 'generic-udp', label: 'Generic UDP', defaultPort: 5000, auth: 'None', transport: 'UDP' },
  { type: 'art-net', label: 'Art-Net', defaultPort: 6454, auth: 'None', transport: 'UDP' },
  { type: 'http-api', label: 'HTTP API', defaultPort: 80, auth: 'Basic', transport: 'HTTP' },
  { type: 'panasonic-nt-control', label: 'Panasonic NTCONTROL', defaultPort: 1024, auth: 'MD5 Challenge', transport: 'TCP' },
]

export function getProtocolOption(type: ProtocolType): ProtocolOption {
  return PROTOCOL_OPTIONS.find(o => o.type === type) ?? PROTOCOL_OPTIONS[0]!
}

export function defaultProtocolConfig(type: ProtocolType): ProtocolConfig {
  return { type, port: getProtocolOption(type).defaultPort }
}

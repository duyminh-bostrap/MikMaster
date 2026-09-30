import { createHash, randomBytes } from 'node:crypto'
import type net from 'node:net'
import { SimServer } from './base.ts'

export interface PanasonicSimOptions {
  host?: string
  port?: number
  /** Có đặt → bật chế độ bảo vệ bằng mật khẩu (MD5). */
  credentials?: { username: string; password: string }
  model?: string
  /** Nhiệt độ khí vào / khí thoát (°C) cho QTM:0 / QTM:1. */
  temps?: [number, number]
}

/** Mô phỏng NTCONTROL theo ghi chú giao thức: banner, băm MD5, khung "00"+lệnh, đóng kết nối sau mỗi phản hồi. */
export class PanasonicSimulator extends SimServer {
  power = false
  shutter = false
  input = 'HD1'
  /** Lệnh đã nhận (không gồm hash) — để test kiểm tra đúng chuỗi được gửi. */
  received: string[] = []
  private opts: PanasonicSimOptions

  constructor(opts: PanasonicSimOptions = {}) {
    super(opts.host ?? '127.0.0.1', opts.port ?? 0)
    this.opts = opts
  }

  protected onConnection(socket: net.Socket): void {
    const challenge = randomBytes(4).toString('hex')
    const creds = this.opts.credentials
    const expected = creds ? createHash('md5').update(`${creds.username}:${creds.password}:${challenge}`).digest('hex') : ''
    socket.write(creds ? `NTCONTROL 1 ${challenge}\r` : 'NTCONTROL 0\r')
    let buffer = ''
    socket.on('data', (chunk: string) => {
      buffer += chunk
      const idx = buffer.indexOf('\r')
      if (idx < 0) return
      let frame = buffer.slice(0, idx)
      buffer = ''
      if (expected) {
        if (!frame.startsWith(expected)) { socket.end('ERRA\r'); return }
        frame = frame.slice(expected.length)
      }
      const command = frame.replace(/^00/, '')
      this.received.push(command)
      socket.end(this.handle(command) + '\r') // máy thật đóng kết nối sau phản hồi
    })
  }

  private handle(cmd: string): string {
    if (cmd === 'PON') { this.power = true; return '00PON' }
    if (cmd === 'POF') { this.power = false; return '00POF' }
    if (cmd === 'QPW') return `00${this.power ? '001' : '000'}`
    if (/^QTM:[01]$/.test(cmd)) {
      if (!this.power) return 'ERR3'
      const [intake, exhaust] = this.opts.temps ?? [30, 45]
      return `00${String(cmd.endsWith('0') ? intake : exhaust).padStart(4, '0')}`
    }
    if (cmd === 'QID') return `00${this.opts.model ?? 'RQ35K'}`
    if (['QSH', 'QIN'].includes(cmd) || /^(OSH|IIS):/.test(cmd) || /^O(MN|EN|CU|CD|CL|CR)$/.test(cmd)) {
      if (!this.power) return 'ERR3'
      if (cmd === 'QSH') return `00${this.shutter ? 1 : 0}`
      if (cmd === 'QIN') return `00${this.input}`
      const osh = /^OSH:([01])$/.exec(cmd)
      if (osh) { this.shutter = osh[1] === '1'; return `00${cmd}` }
      const iis = /^IIS:(\w{3})$/.exec(cmd)
      if (iis) { this.input = iis[1]!; return `00${cmd}` }
      if (/^O[A-Z]{2}$/.test(cmd)) return `00${cmd}`
      return 'ERR2'
    }
    return 'ERR1'
  }
}

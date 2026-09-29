import type net from 'node:net'
import { splitParens } from '../net/tcp.ts'
import { SimServer } from './base.ts'

/** Mô phỏng serial-over-IP của Christie: `(PWR1)`, `(PWR?)` → `(PWR!001 "Power On")`. */
export class ChristieSimulator extends SimServer {
  power = 0
  shutter = 0
  received: string[] = []

  constructor(opts: { host?: string; port?: number } = {}) {
    super(opts.host ?? '127.0.0.1', opts.port ?? 0)
  }

  protected onConnection(socket: net.Socket): void {
    let buffer = ''
    socket.on('data', (chunk: string) => {
      const { frames, rest } = splitParens(buffer + chunk)
      buffer = rest
      for (const frame of frames) {
        this.received.push(frame)
        socket.write(this.handle(frame))
      }
    })
  }

  private handle(frame: string): string {
    const m = /^\(([A-Z]{3})(\?|\d+)?\)$/.exec(frame)
    if (!m) return '(ERR "Unrecognized command")'
    const [, code, arg] = m
    if (code === 'PWR') {
      if (arg !== '?') { this.power = Number(arg); if (this.power > 1) return '(ERR "Bad value")' }
      return `(PWR!00${this.power} "${this.power ? 'Power On' : 'Standby Mode'}")`
    }
    if (code === 'SHU') {
      if (!this.power) return '(ERR "Not available in standby")'
      if (arg !== '?') this.shutter = Number(arg)
      return `(SHU!00${this.shutter} "${this.shutter ? 'Closed' : 'Open'}")`
    }
    return '(ERR "Unrecognized command")'
  }
}

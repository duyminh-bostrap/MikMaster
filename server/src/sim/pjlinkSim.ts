import { createHash, randomBytes } from 'node:crypto'
import type net from 'node:net'
import { SimServer } from './base.ts'

export interface PjlinkSimOptions {
  host?: string
  port?: number
  password?: string
  name?: string
  manufacturer?: string
  model?: string
}

export class PjlinkSimulator extends SimServer {
  power: 0 | 1 = 0
  input = '31'
  avmt = '30'
  lampHours = 1200
  erst = '000000'
  private opts: PjlinkSimOptions

  constructor(opts: PjlinkSimOptions = {}) {
    super(opts.host ?? '127.0.0.1', opts.port ?? 0)
    this.opts = opts
  }

  protected onConnection(socket: net.Socket): void {
    const seed = randomBytes(4).toString('hex')
    const digest = this.opts.password === undefined ? '' : createHash('md5').update(seed + this.opts.password).digest('hex')
    socket.write(this.opts.password === undefined ? 'PJLINK 0\r' : `PJLINK 1 ${seed}\r`)
    let buffer = ''
    socket.on('data', (chunk: string) => {
      buffer += chunk
      let idx: number
      while ((idx = buffer.indexOf('\r')) >= 0) {
        let line = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 1)
        if (digest) {
          if (!line.startsWith(digest)) { socket.write('PJLINK ERRA\r'); socket.end(); return }
          line = line.slice(digest.length)
        }
        socket.write(this.handle(line) + '\r')
      }
    })
  }

  private handle(line: string): string {
    const m = /^%1([A-Z0-9]{4}) (.*)$/.exec(line)
    if (!m) return '%1UNKN=ERR1'
    const [, cmd, param] = m as unknown as [string, string, string]
    const reply = (v: string) => `%1${cmd}=${v}`
    const standby = this.power === 0
    switch (cmd) {
      case 'POWR':
        if (param === '?') return reply(String(this.power))
        if (param === '0' || param === '1') { this.power = Number(param) as 0 | 1; return reply('OK') }
        return reply('ERR2')
      case 'INPT':
        if (param === '?') return reply(standby ? 'ERR3' : this.input)
        if (standby) return reply('ERR3')
        if (!/^[1-5][1-9]$/.test(param)) return reply('ERR2')
        this.input = param
        return reply('OK')
      case 'AVMT':
        if (param === '?') return reply(standby ? 'ERR3' : this.avmt)
        if (standby) return reply('ERR3')
        if (!/^[123][01]$/.test(param)) return reply('ERR2')
        this.avmt = param
        return reply('OK')
      case 'ERST': return reply(this.erst)
      case 'LAMP': return reply(`${this.lampHours} ${this.power}`)
      case 'NAME': return reply(this.opts.name ?? 'Sim PJLink')
      case 'INF1': return reply(this.opts.manufacturer ?? 'SimCorp')
      case 'INF2': return reply(this.opts.model ?? 'SIM-1')
      case 'CLSS': return reply('1')
      default: return reply('ERR1')
    }
  }
}

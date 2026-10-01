import type net from 'node:net'
import { splitParens } from '../net/tcp.ts'
import { SimServer } from './base.ts'

/** Mô phỏng serial-over-IP của Christie: `(PWR 1)` hoặc `(PWR1)`, `(PWR?)` → `(PWR!001 "Power On")`. */
export class ChristieSimulator extends SimServer {
  power = 0
  shutter = 0
  /** (ITP n): 0 = tắt. */
  pattern = 0
  /** (OSD 0|1): mặc định hiện. */
  osd = 1
  /** (SIN+MAIN n): cổng đang chọn. */
  mainInput = 3
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

  /** Trích từ phản hồi thật của Griffyn 4K50-RGB (2026-09-29). */
  static readonly SST: Record<string, string[]> = {
    TEMP: [
      '(SST+TEMP!002 000 "30 °C" "Air Intake Temperature \\(Temp 2\\)")',
      '(SST+TEMP!004 000 "47 °C" "Main Control Board Temperature")',
      '(SST+TEMP!124 000 "66 °C" "Power Supply 1 Temperature")',
    ],
    LGHT: [
      '(SST+LGHT!000 000 "On" "LOS State")',
      '(SST+LGHT!186 000 "260.3" "Laser On Hours")',
    ],
    SYST: [
      '(SST+SYST!000 000 "466:50 \\(h:m\\)" "Projector Hours")',
      '(SST+SYST!001 000 "8.00 / 2.00" "Pitch / Roll")',
    ],
  }

  private handle(frame: string): string {
    const sst = /^\(SST\+([A-Z]{4})\?\)$/.exec(frame)
    if (sst) return ChristieSimulator.SST[sst[1]!]?.join('') ?? `(65535 00000 ERR00102 "SST+${sst[1]}: Cannot find status group")`
    const sinMain = /^\(SIN\+MAIN (\d+)\)$/.exec(frame)
    if (sinMain) { this.mainInput = Number(sinMain[1]); return `(SIN+MAIN!${String(this.mainInput).padStart(3, '0')} "Input")` }
    const m = /^\(([A-Z]{3}) ?(\?|\d+)?\)$/.exec(frame)
    if (!m) return '(ERR "Unrecognized command")'
    const [, code, arg] = m
    if (code === 'PWR') {
      if (arg !== '?') { this.power = Number(arg); if (this.power > 1) return '(ERR "Bad value")' }
      return `(PWR!00${this.power} "${this.power ? 'Power On' : 'Standby Mode'}")`
    }
    if (code === 'SIN' && arg === '?') return '(SIN!001 "One-Port HDMI0")'
    const lens: Record<string, string> = { LHO: '-003', LVO: '-604', ZOM: '-050', FCS: '273' }
    if (code! in lens && arg === '?') return `(${code}!${lens[code!]})`
    if (code === 'OSD') {
      if (arg !== '?') this.osd = Number(arg)
      return `(OSD!00${this.osd})`
    }
    if (code === 'ITP') {
      if (arg !== '?') { this.pattern = Number(arg); if (this.pattern > 13) return '(65535 00000 ERR00012 "Value out of range")' }
      return `(ITP!${String(this.pattern).padStart(3, '0')} "${this.pattern ? 'Pattern' : 'Off'}")`
    }
    if (code === 'SHU') {
      if (!this.power) return '(ERR "Not available in standby")'
      if (arg !== '?') this.shutter = Number(arg)
      return `(SHU!00${this.shutter} "${this.shutter ? 'Closed' : 'Open'}")`
    }
    return '(ERR "Unrecognized command")'
  }
}

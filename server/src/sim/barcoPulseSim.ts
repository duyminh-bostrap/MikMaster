import type net from 'node:net'
import { splitJson } from '../net/tcp.ts'
import { SimServer } from './base.ts'

/** Mô phỏng Barco Pulse JSON-RPC: system.poweron/off, property.get/set system.state, optics.shutter.target. */
export class BarcoPulseSimulator extends SimServer {
  state = 'standby'
  shutter = 'Open'
  received: Array<{ method: string; params?: Record<string, unknown> }> = []

  constructor(opts: { host?: string; port?: number } = {}) {
    super(opts.host ?? '127.0.0.1', opts.port ?? 0)
  }

  protected onConnection(socket: net.Socket): void {
    let buffer = ''
    // Máy thật có thể đẩy thông báo bất kỳ lúc nào: gửi một cái ngay khi kết nối để driver phải bỏ qua đúng cách.
    socket.write(JSON.stringify({ jsonrpc: '2.0', method: 'notification', params: { signal: 'hello' } }))
    socket.on('data', (chunk: string) => {
      const { frames, rest } = splitJson(buffer + chunk)
      buffer = rest
      for (const frame of frames) socket.write(JSON.stringify(this.handle(JSON.parse(frame))))
    })
  }

  private handle(req: { method: string; params?: Record<string, unknown>; id: unknown }) {
    this.received.push({ method: req.method, params: req.params })
    const ok = (result: unknown) => ({ jsonrpc: '2.0', id: req.id, result })
    const fail = (code: number, message: string) => ({ jsonrpc: '2.0', id: req.id, error: { code, message } })
    switch (req.method) {
      case 'system.poweron': this.state = 'on'; return ok(true)
      case 'system.poweroff': this.state = 'standby'; return ok(true)
      case 'property.get':
        if (req.params?.property === 'system.state') return ok(this.state)
        if (req.params?.property === 'optics.shutter.target') return ok(this.shutter)
        return fail(-32602, 'Unknown property')
      case 'property.set':
        if (req.params?.property === 'optics.shutter.target') { this.shutter = String(req.params.value); return ok(this.shutter) }
        return fail(-32602, 'Unknown property')
      default: return fail(-32601, 'Method not found')
    }
  }
}

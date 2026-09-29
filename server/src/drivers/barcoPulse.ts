import type { CommandDto, StatusDto } from '../../../shared/api.ts'
import { DeviceError, TcpConnection, serialize, splitJson } from '../net/tcp.ts'
import type { Driver, DriverTarget, ProbeResult } from './types.ts'

/*
 * Barco Pulse (UDX, UDM, F-series, Hodr, Freya…): JSON-RPC 2.0 qua TCP (mặc định cổng 9090).
 *
 * Nguồn: tài liệu tổng hợp do người dùng cung cấp (2026-09) — JSON-RPC 2.0, system.poweron,
 * property.set "optics.shutter.target" = "Open" | "Closed", property.get "system.state".
 * CHƯA thử trên máy thật; chưa có lệnh input (chưa có tài liệu).
 *
 *   → {"jsonrpc":"2.0","method":"property.get","params":{"property":"system.state"},"id":1}
 *   ← {"jsonrpc":"2.0","id":1,"result":"on"}
 * Máy có thể đẩy thông báo (không có id) bất cứ lúc nào → bỏ qua cho tới khi gặp đúng id.
 */

let nextId = 1

interface RpcReply { id?: unknown; result?: unknown; error?: { code?: number; message?: string } }

function call(t: DriverTarget, method: string, params?: Record<string, unknown>): Promise<unknown> {
  return serialize(`${t.host}:${t.port}`, async () => {
    const conn = await TcpConnection.open(t.host, t.port, t.timeoutMs, splitJson)
    const id = nextId++
    try {
      conn.write(JSON.stringify({ jsonrpc: '2.0', method, ...(params ? { params } : {}), id }))
      for (;;) {
        let reply: RpcReply
        try { reply = JSON.parse(await conn.read()) as RpcReply } catch (err) {
          if (err instanceof DeviceError) throw err
          throw new DeviceError('protocol', 'Not a Barco Pulse device (invalid JSON-RPC reply)')
        }
        if (reply.id !== id) continue // thông báo đẩy về, không phải phản hồi của mình
        if (reply.error) {
          const msg = reply.error.message ?? `JSON-RPC error ${reply.error.code}`
          throw new DeviceError(/auth|permission|access/i.test(msg) ? 'auth' : 'device', msg)
        }
        return reply.result
      }
    } finally { conn.close() }
  })
}

const getProperty = (t: DriverTarget, property: string) => call(t, 'property.get', { property })

function powerState(state: unknown): StatusDto['power'] {
  switch (String(state).toLowerCase()) {
    case 'on': return 'on'
    case 'conditioning': return 'warmup'
    case 'deconditioning': return 'cooling'
    case 'standby': case 'ready': case 'eco': case 'boot': case 'error': return 'standby'
    default: return undefined
  }
}

export const barcoPulseDriver: Driver = {
  async status(t) {
    const state = await getProperty(t, 'system.state')
    const status: StatusDto = { power: powerState(state), errors: String(state).toLowerCase() === 'error' ? ['Projector error'] : [] }
    if (status.power === 'on') {
      const shutter = await getProperty(t, 'optics.shutter.target').catch(err => {
        if (err instanceof DeviceError && err.code === 'device') return undefined
        throw err
      })
      if (typeof shutter === 'string') status.shutter = shutter.toLowerCase() === 'closed'
    }
    return status
  },

  async command(t, c: CommandDto) {
    switch (c.kind) {
      case 'power': await call(t, c.value === 'on' ? 'system.poweron' : 'system.poweroff'); return
      case 'shutter': await call(t, 'property.set', { property: 'optics.shutter.target', value: c.closed ? 'Closed' : 'Open' }); return
      default: throw new DeviceError('unsupported', `Barco Pulse "${c.kind}" has no verified command yet`)
    }
  },

  /** RAW: một đối tượng JSON-RPC đầy đủ, hoặc chỉ "method" / "method {params}" cho nhanh. */
  async raw(t, text) {
    const trimmed = text.trim()
    if (trimmed.startsWith('{')) {
      let req: { method?: string; params?: Record<string, unknown> }
      try { req = JSON.parse(trimmed) } catch { throw new DeviceError('bad-request', 'Invalid JSON') }
      if (!req.method) throw new DeviceError('bad-request', 'JSON-RPC request needs "method"')
      return JSON.stringify(await call(t, req.method, req.params))
    }
    const m = /^(\S+)(?:\s+(\{.*\}))?$/s.exec(trimmed)
    if (!m) throw new DeviceError('bad-request', 'Use: method  or  method {"param": …}  or a full JSON-RPC object')
    let params: Record<string, unknown> | undefined
    if (m[2]) { try { params = JSON.parse(m[2]) } catch { throw new DeviceError('bad-request', 'Invalid JSON params') } }
    return JSON.stringify(await call(t, m[1]!, params))
  },

  async probe(host, port, timeoutMs) {
    try {
      await getProperty({ host, port, timeoutMs }, 'system.state')
      return { authRequired: false, manufacturer: 'Barco' } satisfies ProbeResult
    } catch { return null }
  },
}

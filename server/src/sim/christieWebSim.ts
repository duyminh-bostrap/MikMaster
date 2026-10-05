import http from 'node:http'
import type { AddressInfo } from 'node:net'

/** PNG 1×1 dùng làm ảnh preview giả. */
export const SIM_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

/**
 * Mô phỏng web JSON-RPC của Christie Griffyn (định dạng theo giao diện web của máy thật, firmware 1.3.7):
 * session:connect → khoá phiên; video:getInputInfo → danh sách ảnh; /cgi-bin/thumbnail?SessionId=…&filename=… → PNG.
 */
export class ChristieWebSimulator {
  private server = http.createServer((req, res) => this.handle(req, res))
  private sessions = new Set<string>()
  private nextId = 1
  port = 0
  signal: 'image' | 'no-signal' = 'image'
  requests: string[] = []

  private readonly creds: { user: string; pass: string }

  constructor(creds = { user: 'sim-operator', pass: 'sim-pass' }) { this.creds = creds }

  async start(): Promise<void> {
    await new Promise<void>(r => this.server.listen(0, '127.0.0.1', r))
    this.port = (this.server.address() as AddressInfo).port
  }
  async stop(): Promise<void> { await new Promise(r => this.server.close(r)) }
  /** Giả lập máy khởi động lại / phiên hết hạn. */
  expireSessions(): void { this.sessions.clear() }

  private handle(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url ?? '/', 'http://sim')
    this.requests.push(`${req.method} ${url.pathname}`)
    if (req.method === 'GET' && url.pathname === '/cgi-bin/thumbnail') {
      if (!this.sessions.has(url.searchParams.get('SessionId') ?? '')) { res.writeHead(401).end(); return }
      res.writeHead(200, { 'Content-Type': 'image/png' }).end(SIM_PNG)
      return
    }
    let body = ''
    req.on('data', c => { body += c })
    req.on('end', () => {
      const msg = JSON.parse(body || '{}') as { id?: number; method?: string; params?: { user?: string; pass?: string } }
      const reply = (x: object) => res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: msg.id, ...x }))
      if (url.pathname === '/cgi-bin/c4jweb/' && msg.method === 'session:connect') {
        const p = msg.params
        if (!p || typeof p !== 'object' || p.user === undefined) return reply({ error: { code: 3, message: 'Invalid Parameter' } })
        if (p.user !== this.creds.user || p.pass !== this.creds.pass) return reply({ error: { code: 2, message: 'Invalid Credentials' } })
        const sid = String(this.nextId++).padStart(9, '0')
        this.sessions.add(sid)
        return reply({ result: `/cgi-bin/c4jweb?SessionId=${sid}` })
      }
      if (url.pathname === '/cgi-bin/c4jweb' && msg.method === 'video:getInputInfo') {
        if (!this.sessions.has(url.searchParams.get('SessionId') ?? '')) return reply({ error: { code: 116, message: 'invalid Session ID' } })
        return reply({ result: [
          { idx: 24, imageType: this.signal === 'image' ? 0 : 3, name: 'One-Port HDMI0', path: 'thumbnails/image_2', res: '1920x1080', active: true },
          { idx: 26, imageType: 3, name: 'One-Port HDMI1', path: '', res: '', active: false },
        ] })
      }
      reply({ error: { code: 116, message: 'invalid Session ID' } })
    })
  }
}

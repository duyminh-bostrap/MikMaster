import net from 'node:net'

/** Khung chung cho các bộ giả lập: mở cổng, xử lý từng kết nối, dừng gọn. */
export abstract class SimServer {
  private server: net.Server | null = null
  private sockets = new Set<net.Socket>()
  readonly host: string
  port: number
  /** true → nhận kết nối nhưng không bao giờ trả lời (để thử timeout). */
  silent = false

  constructor(host: string, port: number) {
    this.host = host
    this.port = port
  }

  protected abstract onConnection(socket: net.Socket): void

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = net.createServer(socket => {
        this.sockets.add(socket)
        socket.setEncoding('latin1')
        socket.on('close', () => this.sockets.delete(socket))
        socket.on('error', () => undefined)
        if (!this.silent) this.onConnection(socket)
      })
      server.once('error', reject)
      server.listen(this.port, this.host, () => {
        this.port = (server.address() as net.AddressInfo).port
        this.server = server
        resolve()
      })
    })
  }

  stop(): Promise<void> {
    for (const s of this.sockets) s.destroy()
    return new Promise(resolve => (this.server ? this.server.close(() => resolve()) : resolve()))
  }
}

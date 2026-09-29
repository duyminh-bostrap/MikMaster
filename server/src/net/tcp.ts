import net from 'node:net'
import type { ApiErrorCode } from '../../../shared/api.ts'

export class DeviceError extends Error {
  readonly code: ApiErrorCode
  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.name = 'DeviceError'
    this.code = code
  }
}

/** Tách luồng byte thành các khung hoàn chỉnh; phần chưa đủ trả về ở `rest`. */
export type FrameSplitter = (buffer: string) => { frames: string[]; rest: string }

/** PJLink, Panasonic: mỗi dòng kết thúc bằng CR. */
export const splitOnCR: FrameSplitter = buffer => {
  const parts = buffer.split('\r')
  const rest = parts.pop() ?? ''
  return { frames: parts.map(p => p.replace(/^\n/, '')).filter(p => p.length > 0), rest }
}

/** Christie: khung dạng `( ... )`, dấu `)` trong chuỗi nháy kép không tính là kết thúc. */
export const splitParens: FrameSplitter = buffer => {
  const frames: string[] = []
  let start = -1
  let inQuote = false
  let consumed = 0
  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer[i]
    if (start === -1) {
      if (ch === '(') start = i
      else consumed = i + 1 // bỏ qua CR/LF rời rạc giữa các khung
      continue
    }
    if (ch === '"') inQuote = !inQuote
    else if (ch === ')' && !inQuote) {
      frames.push(buffer.slice(start, i + 1))
      start = -1
      consumed = i + 1
    }
  }
  return { frames, rest: buffer.slice(start === -1 ? consumed : start) }
}

export class TcpConnection {
  private socket: net.Socket
  private splitter: FrameSplitter
  private timeoutMs: number
  private buffer = ''
  private frames: string[] = []
  private failure: DeviceError | null = null
  private ended = false
  private wake: (() => void) | null = null

  private constructor(socket: net.Socket, splitter: FrameSplitter, timeoutMs: number) {
    this.socket = socket
    this.splitter = splitter
    this.timeoutMs = timeoutMs
    socket.setEncoding('latin1')
    socket.on('data', (chunk: string) => {
      const { frames, rest } = this.splitter(this.buffer + chunk)
      this.buffer = rest
      this.frames.push(...frames)
      this.wake?.()
    })
    socket.on('error', err => {
      this.failure = new DeviceError('connect', `Socket error: ${err.message}`)
      this.wake?.()
    })
    socket.on('close', () => {
      this.ended = true
      this.wake?.()
    })
  }

  static open(host: string, port: number, timeoutMs: number, splitter: FrameSplitter): Promise<TcpConnection> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port })
      socket.setNoDelay(true)
      const timer = setTimeout(() => {
        socket.destroy()
        reject(new DeviceError('timeout', `Connect to ${host}:${port} timed out after ${timeoutMs}ms`))
      }, timeoutMs)
      socket.once('connect', () => {
        clearTimeout(timer)
        socket.removeAllListeners('error')
        resolve(new TcpConnection(socket, splitter, timeoutMs))
      })
      socket.once('error', err => {
        clearTimeout(timer)
        reject(new DeviceError('connect', `Cannot connect to ${host}:${port} (${err.message})`))
      })
    })
  }

  write(data: string): void {
    this.socket.write(data, 'latin1')
  }

  /** Đọc khung kế tiếp; khung đã nhận trước khi thiết bị đóng kết nối vẫn đọc được. */
  async read(timeoutMs = this.timeoutMs): Promise<string> {
    const deadline = Date.now() + timeoutMs
    for (;;) {
      const frame = this.frames.shift()
      if (frame !== undefined) return frame
      if (this.failure) throw this.failure
      if (this.ended) throw new DeviceError('connect', 'Connection closed by device')
      const remaining = deadline - Date.now()
      if (remaining <= 0) throw new DeviceError('timeout', `No response within ${timeoutMs}ms`)
      await new Promise<void>(resolve => {
        const timer = setTimeout(resolve, remaining)
        this.wake = () => { clearTimeout(timer); resolve() }
      })
      this.wake = null
    }
  }

  close(): void {
    this.socket.destroy()
  }
}

const tails = new Map<string, Promise<unknown>>()

/** Máy chiếu thường chỉ nhận một kết nối một lúc → tuần tự hoá mọi thao tác trên cùng host:port. */
export function serialize<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve()
  const run = previous.catch(() => undefined).then(task)
  const tail = run.catch(() => undefined)
  tails.set(key, tail)
  void tail.then(() => { if (tails.get(key) === tail) tails.delete(key) })
  return run
}

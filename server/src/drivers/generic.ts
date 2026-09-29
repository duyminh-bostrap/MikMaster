import dgram from 'node:dgram'
import type { CommandDto, StatusDto } from '../../../shared/api.ts'
import { DeviceError, TcpConnection, serialize, type FrameSplitter } from '../net/tcp.ts'
import type { Driver, DriverTarget } from './types.ts'

/*
 * Driver "chung": không biết gì về lệnh của hãng nào nên chỉ có RAW COMMAND (người dùng tự viết lệnh)
 * và không có power/shutter/input/OSD. Vì không có 'power' nên DeviceSync không poll các máy này.
 *
 *   generic-tcp : gửi chuỗi, đọc mọi thứ máy trả về cho tới khi im lặng ~250ms
 *   generic-udp : gửi một datagram, chờ datagram trả lời (nếu có)
 *   art-net     : dựng gói ArtDmx từ "universe ch=val ..." (không có phản hồi)
 *   http-api    : "GET /path" hoặc "POST /path body", Basic auth nếu có username/password
 */

const IDLE_MS = 250
const MAX_REPLY = 4096

/** `\r \n \t \\ \xHH` → ký tự thật; cho phép gõ lệnh có ký tự điều khiển trong ô một dòng. */
export function decodeEscapes(text: string): string {
  return text.replace(/\\(x[0-9a-fA-F]{2}|[rnt\\0])/g, (_, e: string) => {
    if (e[0] === 'x') return String.fromCharCode(parseInt(e.slice(1), 16))
    return ({ r: '\r', n: '\n', t: '\t', '\\': '\\', 0: '\0' } as Record<string, string>)[e]!
  })
}

/** Ngược lại của decodeEscapes, để hiển thị phản hồi có ký tự điều khiển. */
export function encodeEscapes(text: string): string {
  return text.replace(/[^\x20-\x7e]|\\/g, ch => {
    if (ch === '\\') return '\\\\'
    if (ch === '\r') return '\\r'
    if (ch === '\n') return '\\n'
    if (ch === '\t') return '\\t'
    return `\\x${ch.charCodeAt(0).toString(16).padStart(2, '0')}`
  })
}

const everyChunk: FrameSplitter = buffer => ({ frames: buffer ? [buffer] : [], rest: '' })

async function tcpRaw(t: DriverTarget, text: string): Promise<string> {
  return serialize(`${t.host}:${t.port}`, async () => {
    const conn = await TcpConnection.open(t.host, t.port, t.timeoutMs, everyChunk)
    try {
      conn.write(decodeEscapes(text))
      let reply = ''
      try {
        reply = await conn.read()
        while (reply.length < MAX_REPLY) reply += await conn.read(IDLE_MS)
      } catch (err) {
        // Im lặng sau khi đã có dữ liệu là kết thúc bình thường; chưa có gì thì báo không phản hồi.
        if (err instanceof DeviceError && err.code === 'timeout' && reply) { /* xong */ }
        else if (err instanceof DeviceError && err.code === 'timeout') return '(sent, no reply)'
        else if (!(err instanceof DeviceError && err.code === 'connect' && reply)) throw err
      }
      return encodeEscapes(reply.slice(0, MAX_REPLY))
    } finally { conn.close() }
  })
}

function sendDatagram(t: DriverTarget, payload: Buffer, expectReply: boolean): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4')
    const done = (fn: () => void) => { clearTimeout(timer); socket.close(); fn() }
    const timer = setTimeout(() => done(() => resolve(null)), expectReply ? t.timeoutMs : 0)
    socket.once('error', err => done(() => reject(new DeviceError('connect', `UDP error: ${err.message}`))))
    socket.once('message', msg => done(() => resolve(msg)))
    socket.send(payload, t.port, t.host, err => {
      if (err) done(() => reject(new DeviceError('connect', `UDP send failed: ${err.message}`)))
      else if (!expectReply) done(() => resolve(null))
    })
  })
}

async function udpRaw(t: DriverTarget, text: string): Promise<string> {
  const reply = await sendDatagram(t, Buffer.from(decodeEscapes(text), 'latin1'), true)
  return reply ? encodeEscapes(reply.toString('latin1').slice(0, MAX_REPLY)) : '(sent, no reply)'
}

/** "0 1=255 5-8=128" → gói ArtDmx. Universe là số đầu tiên nếu đứng một mình; kênh 1..512. */
export function buildArtDmx(text: string): Buffer {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  let universe = 0
  if (tokens[0] && /^\d+$/.test(tokens[0])) universe = Number(tokens.shift())
  if (universe > 32767) throw new DeviceError('bad-request', 'Universe must be 0–32767')
  const dmx = new Uint8Array(512)
  let highest = 0
  if (tokens.length === 0) throw new DeviceError('bad-request', 'Use: [universe] ch=value ...  e.g. "0 1=255 5-8=128"')
  for (const tok of tokens) {
    const m = /^(\d{1,3})(?:-(\d{1,3}))?=(\d{1,3})$/.exec(tok)
    if (!m) throw new DeviceError('bad-request', `Cannot parse "${tok}" (expected ch=value or from-to=value)`)
    const from = Number(m[1]), to = Number(m[2] ?? m[1]), value = Number(m[3])
    if (from < 1 || to > 512 || from > to || value > 255) throw new DeviceError('bad-request', `Out of range: "${tok}" (channels 1–512, value 0–255)`)
    for (let c = from; c <= to; c++) dmx[c - 1] = value
    highest = Math.max(highest, to)
  }
  const length = Math.max(2, highest + (highest % 2)) // độ dài DMX phải chẵn
  const header = Buffer.alloc(18)
  header.write('Art-Net\0', 0, 'latin1')
  header.writeUInt16LE(0x5000, 8) // OpOutput / ArtDmx
  header.writeUInt16BE(14, 10) // protocol version
  header[12] = 0 // sequence (0 = tắt)
  header[13] = 0 // physical
  header.writeUInt16LE(universe, 14) // SubUni + Net
  header.writeUInt16BE(length, 16)
  return Buffer.concat([header, dmx.subarray(0, length)])
}

async function httpRaw(t: DriverTarget, text: string): Promise<string> {
  const m = /^(GET|POST|PUT|DELETE)\s+(\/\S*)(?:\s+([\s\S]*))?$/i.exec(text.trim())
  if (!m) throw new DeviceError('bad-request', 'Use: GET /path   or   POST /path body')
  const [, method, path, body] = m as unknown as [string, string, string, string | undefined]
  const headers: Record<string, string> = {}
  if (t.username || t.password) headers.Authorization = `Basic ${Buffer.from(`${t.username ?? ''}:${t.password ?? ''}`).toString('base64')}`
  if (body) headers['Content-Type'] = body.trim().startsWith('{') ? 'application/json' : 'text/plain'
  try {
    // redirect: 'manual' — không để thiết bị chuyển hướng gateway sang địa chỉ ngoài dải cho phép.
    const res = await fetch(`http://${t.host}:${t.port}${path}`, {
      method: method.toUpperCase(), headers, body: body || undefined, redirect: 'manual', signal: AbortSignal.timeout(t.timeoutMs),
    })
    const text = (await res.text()).slice(0, MAX_REPLY)
    return `${res.status} ${res.statusText}\n${text}`.trim()
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') throw new DeviceError('timeout', `No response within ${t.timeoutMs}ms`)
    throw new DeviceError('connect', `HTTP request failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

const noCommands = (): never => { throw new DeviceError('unsupported', 'Generic protocols only support RAW COMMAND') }
const noProbe = async () => null

export const genericTcpDriver: Driver = {
  async status(t): Promise<StatusDto> {
    const conn = await TcpConnection.open(t.host, t.port, t.timeoutMs, everyChunk)
    conn.close()
    return { errors: [] }
  },
  command: async (_t, _c: CommandDto) => noCommands(),
  raw: tcpRaw,
  probe: noProbe,
}

export const genericUdpDriver: Driver = {
  status: async () => { throw new DeviceError('unsupported', 'UDP is connectionless: reachability cannot be checked') },
  command: async () => noCommands(),
  raw: udpRaw,
  probe: noProbe,
}

export const artNetDriver: Driver = {
  status: genericUdpDriver.status,
  command: async () => noCommands(),
  async raw(t, text) {
    const packet = buildArtDmx(text)
    await sendDatagram(t, packet, false)
    return `(sent ArtDmx: ${packet.length - 18} channels)`
  },
  probe: noProbe,
}

export const httpApiDriver: Driver = {
  async status(t): Promise<StatusDto> {
    await httpRaw(t, 'GET /')
    return { errors: [] }
  },
  command: async () => noCommands(),
  raw: httpRaw,
  probe: noProbe,
}

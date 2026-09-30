import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import http from 'node:http'
import type { Socket } from 'node:net'
import type { AddressInfo } from 'node:net'
import { after, afterEach, describe, test } from 'node:test'
import { closeAllPanasonicStreams, panasonicPreview } from '../src/drivers/panasonicWeb.ts'

// JPEG tối thiểu (2 byte đầu FFD8 là đủ để driver nhận diện).
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64')

/** Khung WebSocket phía máy chủ (không che): 1 = text, 2 = binary. */
function frame(opcode: 1 | 2, payload: Buffer): Buffer {
  const head = payload.length < 126 ? Buffer.from([0x80 | opcode, payload.length]) : Buffer.from([0x80 | opcode, 126, payload.length >> 8, payload.length & 255])
  return Buffer.concat([head, payload])
}

/** "Máy chiếu" giả nói giao thức pj-cast-protocol: sau khi nhận 'start' thì gửi ảnh JPEG đều đặn (hoặc chuỗi trạng thái). */
function fakeProjector(mode: 'frames' | 'blank' | 'hdcp' | 'silent') {
  const received: string[] = []
  const sockets = new Set<Socket>()
  let connections = 0
  let subprotocol = ''
  const server = http.createServer()
  server.on('upgrade', (req, socket: Socket) => {
    connections++
    sockets.add(socket)
    subprotocol = String(req.headers['sec-websocket-protocol'] ?? '')
    const accept = crypto.createHash('sha1').update(`${req.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64')
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\nSec-WebSocket-Protocol: pj-cast-protocol\r\n\r\n`)
    let timer: ReturnType<typeof setInterval> | undefined
    socket.on('data', (d: Buffer) => {
      // Khung của khách luôn được che (mask): đọc text ngắn.
      const len = d[1]! & 0x7f, mask = d.subarray(2, 6), body = d.subarray(6, 6 + len)
      const text = Buffer.from(body.map((b, i) => b ^ mask[i % 4]!)).toString()
      received.push(text)
      if (text !== 'start') return
      if (mode === 'blank') socket.write(frame(1, Buffer.from('BLANK')))
      else if (mode === 'hdcp') socket.write(frame(1, Buffer.from('HDCP')))
      else if (mode === 'frames') { socket.write(frame(1, Buffer.from('SIGNAL'))); timer = setInterval(() => socket.write(frame(2, JPEG)), 50) }
    })
    socket.on('close', () => { clearInterval(timer); sockets.delete(socket) })
    socket.on('error', () => undefined)
  })
  return { server, received, get connections() { return connections }, get subprotocol() { return subprotocol }, stop: async () => { for (const s of sockets) s.destroy(); server.close() } }
}

describe('Panasonic Remote preview over WebSocket (pj-cast-protocol on port 8080)', () => {
  const started: Array<ReturnType<typeof fakeProjector>> = []
  const start = async (mode: Parameters<typeof fakeProjector>[0]) => {
    const fp = fakeProjector(mode); started.push(fp)
    await new Promise<void>(r => fp.server.listen(0, '127.0.0.1', r))
    return { fp, port: (fp.server.address() as AddressInfo).port }
  }
  const target = { host: '127.0.0.1', port: 4352, timeoutMs: 2000 }
  afterEach(() => closeAllPanasonicStreams())
  after(async () => { for (const s of started) await s.stop() })

  test('connects with the pj-cast-protocol sub-protocol, sends only "start", and returns the JPEG as a data URL (no account needed)', async () => {
    const { fp, port } = await start('frames')
    const r = await panasonicPreview(target, port)
    assert.equal(r.state, 'image')
    assert.equal(r.image, `data:image/jpeg;base64,${JPEG.toString('base64')}`)
    assert.equal(fp.subprotocol, 'pj-cast-protocol')
    assert.deepEqual(fp.received, ['start']) // không bao giờ gửi preshow:1 / preshow:0 (đổi cài đặt máy)
  })

  test('one shared connection serves many callers (page + dashboard cards)', async () => {
    const { fp, port } = await start('frames')
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => panasonicPreview(target, port)))
    assert.ok(results.every(r => r.state === 'image'))
    await panasonicPreview(target, port)
    assert.equal(fp.connections, 1)
  })

  test("'BLANK' → no signal, 'HDCP' → cannot be previewed", async () => {
    const a = await start('blank')
    assert.equal((await panasonicPreview(target, a.port)).state, 'no-signal')
    const b = await start('hdcp')
    assert.equal((await panasonicPreview(target, b.port)).state, 'no-thumbnail')
  })

  test('a projector that never sends an image → clear timeout error; nothing listening → connect error', async () => {
    const { port } = await start('silent')
    await assert.rejects(panasonicPreview(target, port), (e: { code?: string; message: string }) => e.code === 'timeout' && /no preview image/.test(e.message))
    await assert.rejects(panasonicPreview({ ...target, host: '127.0.0.1' }, 1), (e: { code?: string }) => e.code === 'connect' || e.code === 'timeout')
  })
})

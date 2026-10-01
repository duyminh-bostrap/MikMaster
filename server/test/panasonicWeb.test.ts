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
function fakeProjector(mode: 'frames' | 'blank' | 'hdcp' | 'silent' | 'standby') {
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
    socket.on('data', (chunk: Buffer) => {
     // Một gói TCP có thể chứa nhiều khung của khách (vd. 'start' rồi 'preshow:1'): đọc lần lượt, mỗi khung đã được che (mask).
     for (let d = chunk; d.length >= 6;) {
      const len = d[1]! & 0x7f, mask = d.subarray(2, 6), body = d.subarray(6, 6 + len)
      d = d.subarray(6 + len)
      const text = Buffer.from(body.map((b, i) => b ^ mask[i % 4]!)).toString()
      received.push(text)
      if (mode === 'standby') {
        // Máy đang tắt: chỉ có 'BLANK' cho tới khi bật Pre-Show; 'preshow:0' trả về BLANK.
        if (text === 'start') socket.write(frame(1, Buffer.from('BLANK')))
        else if (text === 'preshow:1') { socket.write(frame(1, Buffer.from('CHANGING_PRE'))); setTimeout(() => { socket.write(frame(1, Buffer.from('SIGNAL'))); timer = setInterval(() => socket.write(frame(2, JPEG)), 50) }, 150) }
        else if (text === 'preshow:0') { clearInterval(timer); socket.write(frame(1, Buffer.from('BLANK'))) }
        continue
      }
      if (text !== 'start') continue
      if (mode === 'blank') socket.write(frame(1, Buffer.from('BLANK')))
      else if (mode === 'hdcp') socket.write(frame(1, Buffer.from('HDCP')))
      else if (mode === 'frames') { socket.write(frame(1, Buffer.from('SIGNAL'))); timer = setInterval(() => socket.write(frame(2, JPEG)), 50) }
     }
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

  test("'BLANK' → no signal, 'HDCP' → its own state (protected content)", async () => {
    const a = await start('blank')
    assert.equal((await panasonicPreview(target, a.port)).state, 'no-signal')
    const b = await start('hdcp')
    assert.equal((await panasonicPreview(target, b.port)).state, 'hdcp')
  })

  test('a projector that never sends an image → clear timeout error; nothing listening → connect error', async () => {
    const { port } = await start('silent')
    await assert.rejects(panasonicPreview(target, port), (e: { code?: string; message: string }) => e.code === 'timeout' && /no preview image/.test(e.message))
    await assert.rejects(panasonicPreview({ ...target, host: '127.0.0.1' }, 1), (e: { code?: string }) => e.code === 'connect' || e.code === 'timeout')
  })

  test('Pre-Show: a standby projector shows only BLANK; asking for preshow sends "preshow:1" ONCE and then returns pictures; stopping sends "preshow:0"', async () => {
    const { fp, port } = await start('standby')
    assert.equal((await panasonicPreview(target, port)).state, 'no-signal') // không yêu cầu → không đụng cài đặt máy
    assert.deepEqual(fp.received, ['start'])
    const first = await panasonicPreview(target, port, { preshow: true }).catch((e: Error) => e) // đang đổi chế độ: có thể chưa kịp có ảnh
    assert.ok(first instanceof Error || first.state === 'image')
    let r = await panasonicPreview(target, port, { preshow: true })
    for (let i = 0; i < 20 && r.state !== 'image'; i++) r = await panasonicPreview(target, port, { preshow: true }).catch(() => r)
    assert.equal(r.state, 'image')
    assert.equal(fp.received.filter(x => x === 'preshow:1').length, 1) // đúng một lần dù hỏi nhiều lần
    await panasonicPreview(target, port, { preshow: false })
    await new Promise(r => setTimeout(r, 150))
    assert.deepEqual(fp.received.filter(x => x.startsWith('preshow')), ['preshow:1', 'preshow:0'])
  })

  test('Pre-Show enabled by the driver is restored ("preshow:0") when the stream closes; it is never sent if nobody asked', async () => {
    const { fp, port } = await start('standby')
    await panasonicPreview(target, port, { preshow: true }).catch(() => undefined)
    closeAllPanasonicStreams()
    await new Promise(r => setTimeout(r, 200))
    assert.deepEqual(fp.received.filter(x => x.startsWith('preshow')), ['preshow:1', 'preshow:0'])
    const idle = await start('standby')
    await panasonicPreview(target, idle.port)
    closeAllPanasonicStreams()
    await new Promise(r => setTimeout(r, 200))
    assert.deepEqual(idle.fp.received.filter(x => x === 'start' || x.startsWith('preshow')), ['start']) // (khung đóng kết nối không tính)
  })

  test('Pre-Show already on (the projector streams pictures right away) → "preshow:1" is NOT sent, and nothing is "restored" (the user\'s own setting stays)', async () => {
    const { fp, port } = await start('frames')
    const r = await panasonicPreview(target, port, { preshow: true })
    assert.equal(r.state, 'image')
    closeAllPanasonicStreams()
    await new Promise(res => setTimeout(res, 200))
    assert.deepEqual(fp.received.filter(x => x === 'start' || x.startsWith('preshow')), ['start'])
  })
})

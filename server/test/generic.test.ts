import assert from 'node:assert/strict'
import dgram from 'node:dgram'
import http from 'node:http'
import net from 'node:net'
import type { AddressInfo } from 'node:net'
import { after, before, describe, test } from 'node:test'
import { artNetDriver, buildArtDmx, decodeEscapes, encodeEscapes, genericTcpDriver, genericUdpDriver, httpApiDriver } from '../src/drivers/generic.ts'
import type { DriverTarget } from '../src/drivers/types.ts'

const target = (port: number, extra: Partial<DriverTarget> = {}): DriverTarget => ({ host: '127.0.0.1', port, timeoutMs: 800, ...extra })

let tcp: net.Server, udp: dgram.Socket, web: http.Server
let tcpPort = 0, udpPort = 0, webPort = 0
const udpSeen: Buffer[] = []
let lastAuth: string | undefined

before(async () => {
  tcp = net.createServer(sock => {
    sock.on('data', d => {
      if (d.toString('latin1') === 'SILENT\r') return
      sock.write('ECHO:'); setTimeout(() => sock.write(d.toString('latin1').replace(/\r$/, '') + '\r\n'), 50)
    })
  })
  await new Promise<void>(r => tcp.listen(0, '127.0.0.1', r)); tcpPort = (tcp.address() as AddressInfo).port

  udp = dgram.createSocket('udp4')
  udp.on('message', (msg, rinfo) => { udpSeen.push(msg); if (msg.toString() === 'ping') udp.send('pong', rinfo.port, rinfo.address) })
  await new Promise<void>(r => udp.bind(0, '127.0.0.1', r)); udpPort = udp.address().port

  web = http.createServer((req, res) => {
    lastAuth = req.headers.authorization
    if (req.url === '/redir') { res.writeHead(302, { Location: 'http://8.8.8.8/' }); return res.end() }
    let body = ''
    req.on('data', c => (body += c)).on('end', () => { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end(`${req.method} ${req.url} ${body}`) })
  })
  await new Promise<void>(r => web.listen(0, '127.0.0.1', r)); webPort = (web.address() as AddressInfo).port
})
after(async () => {
  tcp.close(); udp.close(); web.closeAllConnections?.(); await new Promise(r => web.close(r))
})

describe('escapes', () => {
  test('decode / encode round trip', () => {
    assert.equal(decodeEscapes('PWR\\r\\n\\x02\\\\'), 'PWR\r\n\x02\\')
    assert.equal(encodeEscapes('a\r\n\x02\\'), 'a\\r\\n\\x02\\\\')
  })
})

describe('generic TCP', () => {
  test('sends decoded text and gathers a multi-chunk reply', async () => {
    assert.equal(await genericTcpDriver.raw(target(tcpPort), 'HELLO\\r'), 'ECHO:HELLO\\r\\n')
  })
  test('no reply is reported, not an error', async () => {
    assert.equal(await genericTcpDriver.raw(target(tcpPort, { timeoutMs: 300 }), 'SILENT\\r'), '(sent, no reply)')
  })
  test('status is a connectivity check; refused port → connect error', async () => {
    assert.deepEqual(await genericTcpDriver.status(target(tcpPort)), { errors: [] })
    await assert.rejects(genericTcpDriver.status(target(1)), { code: 'connect' })
  })
  test('commands are unsupported', async () => {
    await assert.rejects(genericTcpDriver.command(target(tcpPort), { kind: 'power', value: 'on' }), { code: 'unsupported' })
  })
})

describe('generic UDP', () => {
  test('returns the reply datagram', async () => {
    assert.equal(await genericUdpDriver.raw(target(udpPort), 'ping'), 'pong')
  })
  test('reports no reply', async () => {
    assert.equal(await genericUdpDriver.raw(target(udpPort, { timeoutMs: 200 }), 'quiet'), '(sent, no reply)')
  })
  test('status unsupported', async () => {
    await assert.rejects(genericUdpDriver.status(target(udpPort)), { code: 'unsupported' })
  })
})

describe('Art-Net', () => {
  test('builds a valid ArtDmx packet', () => {
    const p = buildArtDmx('3 1=255 5-8=128')
    assert.equal(p.subarray(0, 8).toString('latin1'), 'Art-Net\0')
    assert.equal(p.readUInt16LE(8), 0x5000)
    assert.equal(p.readUInt16BE(10), 14)
    assert.equal(p.readUInt16LE(14), 3)
    assert.equal(p.readUInt16BE(16), 8)
    assert.deepEqual([...p.subarray(18)], [255, 0, 0, 0, 128, 128, 128, 128])
  })
  test('odd highest channel pads to even length', () => {
    assert.equal(buildArtDmx('1=1 3=1').readUInt16BE(16), 4)
  })
  for (const text of ['', '1', '0=5', '513=1', '1=256', '9-3=1', '99999 1=1']) {
    test(`rejects "${text}"`, () => assert.throws(() => buildArtDmx(text), { code: 'bad-request' }))
  }
  test('sends the packet over UDP', async () => {
    udpSeen.length = 0
    assert.match(await artNetDriver.raw(target(udpPort), '0 1=200'), /sent ArtDmx/)
    await new Promise(r => setTimeout(r, 100))
    assert.equal(udpSeen.at(-1)?.readUInt16LE(8), 0x5000)
  })
})

describe('HTTP API', () => {
  test('GET and POST with body', async () => {
    assert.equal(await httpApiDriver.raw(target(webPort), 'GET /power'), '200 OK\nGET /power')
    assert.equal(await httpApiDriver.raw(target(webPort), 'POST /set {"on":true}'), '200 OK\nPOST /set {"on":true}')
  })
  test('Basic auth from credentials', async () => {
    await httpApiDriver.raw(target(webPort, { username: 'u', password: 'p' }), 'GET /')
    assert.equal(lastAuth, `Basic ${Buffer.from('u:p').toString('base64')}`)
  })
  test('does not follow redirects', async () => {
    assert.match(await httpApiDriver.raw(target(webPort), 'GET /redir'), /^302/)
  })
  test('rejects malformed request line', async () => {
    await assert.rejects(httpApiDriver.raw(target(webPort), 'power on'), { code: 'bad-request' })
  })
  test('status = reachable', async () => {
    assert.deepEqual(await httpApiDriver.status(target(webPort)), { errors: [] })
    await assert.rejects(httpApiDriver.status(target(1)), { code: 'connect' })
  })
})

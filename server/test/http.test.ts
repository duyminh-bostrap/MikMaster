import assert from 'node:assert/strict'
import type http from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, test } from 'node:test'
import type { ScanFoundDto } from '../../shared/api.ts'
import { createServer } from '../src/http.ts'
import { ChristieSimulator } from '../src/sim/christieSim.ts'
import { PanasonicSimulator } from '../src/sim/panasonicSim.ts'
import { PjlinkSimulator } from '../src/sim/pjlinkSim.ts'
import { isAllowedHost } from '../src/security.ts'

let server: http.Server
let base: string
const pana = new PanasonicSimulator({ credentials: { username: 'admin1', password: 'panasonic' } })
const christie = new ChristieSimulator()

before(async () => {
  server = createServer()
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  await pana.start()
  await christie.start()
})
after(async () => {
  await pana.stop(); await christie.stop()
  await new Promise(r => server.close(r))
})

async function post(path: string, body: unknown) {
  const res = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return { status: res.status, body: await res.json() as any }
}
const panaTarget = (extra = {}) => ({ ip: '127.0.0.1', protocol: { type: 'panasonic-nt-control', port: pana.port, ...extra } })

describe('HTTP API', () => {
  test('health lists driver capabilities (no lens / test pattern)', async () => {
    const body = await (await fetch(`${base}/api/health`)).json() as any
    assert.equal(body.ok, true)
    assert.deepEqual(body.drivers['christie-serial-ip'], ['power', 'shutter', 'raw'])
    for (const caps of Object.values<string[]>(body.drivers)) assert.ok(!caps.includes('lens'))
  })

  test('command then status against the Panasonic simulator', async () => {
    assert.equal((await post('/api/devices/command', { target: panaTarget(), command: { kind: 'power', value: 'on' } })).status, 200)
    await post('/api/devices/command', { target: panaTarget(), command: { kind: 'input', input: 'HDMI 1' } })
    const { status, body } = await post('/api/devices/status', { target: panaTarget() })
    assert.equal(status, 200)
    assert.deepEqual([body.power, body.input], ['on', 'HDMI 1'])
  })

  test('raw endpoint returns the projector reply', async () => {
    const { body } = await post('/api/devices/raw', { target: panaTarget(), text: 'QPW' })
    assert.equal(body.reply, '001')
  })

  test('bad password → 502 auth', async () => {
    const { status, body } = await post('/api/devices/status', { target: panaTarget({ password: 'nope' }) })
    assert.deepEqual([status, body.error.code], [502, 'auth'])
  })

  test('public IPs are refused (SSRF guard)', async () => {
    const { status, body } = await post('/api/devices/status', { target: { ip: '8.8.8.8', protocol: { type: 'pjlink-class1', port: 4352 } } })
    assert.deepEqual([status, body.error.code], [403, 'forbidden-host'])
  })

  test('protocols without a live driver → 501', async () => {
    const { status } = await post('/api/devices/status', { target: { ip: '127.0.0.1', protocol: { type: 'art-net', port: 6454 } } })
    assert.equal(status, 501)
  })

  test('capability gating: OSD on Christie → 501, unreachable device → 502 connect', async () => {
    const ch = { ip: '127.0.0.1', protocol: { type: 'christie-serial-ip', port: christie.port } }
    assert.equal((await post('/api/devices/command', { target: ch, command: { kind: 'osd', key: 'menu' } })).status, 501)
    const dead = await post('/api/devices/status', { target: { ip: '127.0.0.1', protocol: { type: 'pjlink-class1', port: 1 } } })
    assert.deepEqual([dead.status, dead.body.error.code], [502, 'connect'])
  })

  test('malformed input → 400', async () => {
    assert.equal((await post('/api/devices/command', { target: panaTarget(), command: {} })).status, 400)
    assert.equal((await post('/api/devices/raw', { target: panaTarget(), text: '' })).status, 400)
  })

  test('isAllowedHost', () => {
    for (const ok of ['10.0.0.5', '192.168.10.21', '172.16.0.1', '172.31.255.1', '127.0.0.1']) assert.ok(isAllowedHost(ok), ok)
    for (const bad of ['8.8.8.8', '172.32.0.1', '192.169.0.1', '1.2.3', '300.1.1.1', 'localhost']) assert.ok(!isAllowedHost(bad), bad)
  })
})

describe('subnet scan over SSE', () => {
  // Cổng mặc định của từng giao thức trên loopback riêng; bỏ qua nếu môi trường đã dùng cổng đó.
  const sims = [
    new PjlinkSimulator({ host: '127.0.0.21', port: 4352, name: 'Scan PJ' }),
    new PanasonicSimulator({ host: '127.0.0.22', port: 1024 }),
    new ChristieSimulator({ host: '127.0.0.23', port: 3002 }),
  ]
  let ready = false
  before(async () => { try { for (const s of sims) await s.start(); ready = true } catch { /* skip */ } })
  after(async () => { for (const s of sims) await s.stop() })

  test('finds one device of each protocol', async t => {
    if (!ready) return t.skip('default ports unavailable')
    const res = await fetch(`${base}/api/scan?subnet=127.0.0`)
    const text = await res.text()
    const found = [...text.matchAll(/event: found\ndata: (.*)\n/g)].map(m => JSON.parse(m[1]!) as ScanFoundDto)
    assert.deepEqual(found.map(f => [f.ip, f.protocol]).sort(), [
      ['127.0.0.21', 'pjlink-class1'], ['127.0.0.22', 'panasonic-nt-control'], ['127.0.0.23', 'christie-serial-ip'],
    ])
    assert.equal(found.find(f => f.protocol === 'pjlink-class1')?.name, 'Scan PJ')
    assert.match(text, /event: progress\ndata: \{"pct":100/)
    assert.match(text, /event: done/)
  })

  test('rejects a public subnet', async () => {
    assert.equal((await fetch(`${base}/api/scan?subnet=8.8.8`)).status, 400)
  })
})

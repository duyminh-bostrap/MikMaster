import assert from 'node:assert/strict'
import fs from 'node:fs'
import type http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import type { AddressInfo } from 'node:net'
import { after, before, describe, test } from 'node:test'
import type { ScanFoundDto } from '../../shared/api.ts'
import { createServer } from '../src/http.ts'
import { createProjectStore } from '../src/store.ts'
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

describe('token auth', () => {
  let secured: http.Server
  let url: string
  before(async () => {
    secured = createServer({ token: 's3cret-token' })
    await new Promise<void>(r => secured.listen(0, '127.0.0.1', r))
    url = `http://127.0.0.1:${(secured.address() as AddressInfo).port}`
  })
  after(async () => { await new Promise(r => secured.close(r)) })

  const body = JSON.stringify({ target: { ip: '127.0.0.1', protocol: { type: 'pjlink', port: 1 } } })
  const call = (headers: Record<string, string> = {}, q = '') =>
    fetch(`${url}/api/devices/status${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body })

  test('health stays open and reports auth state', async () => {
    const anon = await (await fetch(`${url}/api/health`)).json() as any
    assert.deepEqual([anon.authRequired, anon.authorized], [true, false])
    const ok = await (await fetch(`${url}/api/health`, { headers: { Authorization: 'Bearer s3cret-token' } })).json() as any
    assert.equal(ok.authorized, true)
  })

  test('rejects missing or wrong token with 401', async () => {
    assert.equal((await call()).status, 401)
    assert.equal((await call({ Authorization: 'Bearer nope' })).status, 401)
    assert.equal((await call({}, '?token=nope')).status, 401)
  })

  test('accepts Bearer header or ?token= (past auth: fails on device, not 401)', async () => {
    assert.notEqual((await call({ Authorization: 'Bearer s3cret-token' })).status, 401)
    assert.notEqual((await call({}, '?token=s3cret-token')).status, 401)
  })

  test('scan endpoint is protected too', async () => {
    assert.equal((await fetch(`${url}/api/scan?subnet=127.0.0`)).status, 401)
  })
})

describe('project storage', () => {
  let s: http.Server, u: string, dir: string
  const snap = (id: string, password?: string) => ({
    project: { id, name: 'Show', createdAt: '2026-01-01' },
    booths: [{ id: 'b1', name: 'B' }],
    projectors: [{ id: 'PJ-1', network: { ip: '10.0.0.1', protocol: { type: 'pjlink-class2', port: 4352, ...(password ? { password } : {}) } } }],
  })
  const put = (id: string, body: unknown) => fetch(`${u}/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mikmaster-'))
    s = createServer({ store: createProjectStore(dir) })
    await new Promise<void>(r => s.listen(0, '127.0.0.1', r))
    u = `http://127.0.0.1:${(s.address() as AddressInfo).port}`
  })
  after(async () => { await new Promise(r => s.close(r)); fs.rmSync(dir, { recursive: true, force: true }) })

  test('save → list → load round trip returns the plaintext password', async () => {
    assert.equal((await put('show-1', snap('show-1', 'hunter2'))).status, 200)
    const list = await (await fetch(`${u}/api/projects`)).json() as any[]
    assert.deepEqual([list[0].id, list[0].deviceCount], ['show-1', 1])
    const loaded = await (await fetch(`${u}/api/projects/show-1`)).json() as any
    assert.equal(loaded.projectors[0].network.protocol.password, 'hunter2')
  })

  test('password is encrypted at rest, file is not world-readable', () => {
    const file = path.join(dir, 'projects', 'show-1.json')
    const raw = fs.readFileSync(file, 'utf8')
    assert.ok(!raw.includes('hunter2'))
    assert.match(raw, /enc:v1:/)
    assert.equal(fs.statSync(file).mode & 0o077, 0)
  })

  test('a different key cannot read the password but the project still opens', async () => {
    const other = createProjectStore(dir, Buffer.alloc(32, 7))
    const loaded = other.load('show-1')!
    assert.equal(loaded.projectors[0]!.network!.protocol!.password, undefined)
    assert.equal(loaded.project.name, 'Show')
  })

  test('validation: bad id, mismatched id, missing shape, unknown project', async () => {
    assert.equal((await put('..%2Fetc', snap('x'))).status, 400)
    assert.equal((await put('a', snap('b'))).status, 400)
    assert.equal((await put('a', { project: { id: 'a', name: 'x' } })).status, 400)
    assert.equal((await fetch(`${u}/api/projects/nope`)).status, 404)
  })

  test('delete', async () => {
    assert.equal((await fetch(`${u}/api/projects/show-1`, { method: 'DELETE' })).status, 200)
    assert.equal((await fetch(`${u}/api/projects/show-1`, { method: 'DELETE' })).status, 404)
  })

  test('without a store the routes are 501', async () => {
    assert.equal((await fetch(`${base}/api/projects`)).status, 501)
  })
})

describe('ping', () => {
  const ping = (target: unknown) => post('/api/devices/ping', { target })

  test('open port on loopback: ICMP + TCP ok, works for protocols without a driver', async () => {
    const { status, body } = await ping({ ip: '127.0.0.1', protocol: { type: 'barco-xlm', port: pana.port } })
    assert.equal(status, 200)
    assert.equal(body.tcp.ok, true)
    assert.equal(typeof body.tcp.ms, 'number')
    if (body.icmp !== null) assert.equal(body.icmp.ok, true)
  })

  test('closed port is reported as closed, not as an HTTP error', async () => {
    const { status, body } = await ping({ ip: '127.0.0.1', protocol: { type: 'pjlink-class2', port: 1 } })
    assert.equal(status, 200)
    assert.equal(body.tcp.ok, false)
    assert.match(body.tcp.error, /closed|refused/i)
  })

  test('UDP protocols skip the TCP check', async () => {
    const { body } = await ping({ ip: '127.0.0.1', protocol: { type: 'art-net', port: 6454 } })
    assert.equal(body.tcp, null)
  })

  test('refuses public IPs and bad ports', async () => {
    assert.equal((await ping({ ip: '8.8.8.8', protocol: { type: 'pjlink-class2', port: 4352 } })).status, 403)
    assert.equal((await ping({ ip: '127.0.0.1', protocol: { type: 'pjlink-class2', port: 0 } })).status, 400)
  })
})

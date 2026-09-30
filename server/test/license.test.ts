import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { AddressInfo } from 'node:net'
import { after, before, describe, test } from 'node:test'
import { createServer } from '../src/http.ts'
import { FREE_LIMIT, TRIAL_DAYS, computeMachineCode, createLicenseManager, normalizeMachineCode, parseReleaseCode, signLicense, verifyLicense } from '../src/license.ts'
import { createProjectStore } from '../src/store.ts'
import { PjlinkSimulator } from '../src/sim/pjlinkSim.ts'

// Cặp khoá riêng cho test — không liên quan tới khoá thật.
const pair = crypto.generateKeyPairSync('ed25519')
const PEM = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string
const PUB = pair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
const DAY = 86_400_000

describe('license keys', () => {
  test('sign → verify roundtrip; tampering or another key fails', () => {
    const key = signLicense(PEM, { id: 'a1', licensee: 'ACME', max: 5 })
    assert.equal(verifyLicense(key, PUB)?.licensee, 'ACME')
    const [h, body, sig] = key.split('.')
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body!, 'base64url').toString()), max: 0 })).toString('base64url')
    assert.equal(verifyLicense(`${h}.${forged}.${sig}`, PUB), null)
    const other = crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
    assert.equal(verifyLicense(key, other), null)
    assert.equal(verifyLicense('garbage', PUB), null)
  })
})

describe('license policy', () => {
  let dir: string
  let t = 1_000_000_000_000
  const mgr = () => createLicenseManager(dir, { now: () => t, publicKey: PUB })
  before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mikmaster-lic-')) })
  after(() => fs.rmSync(dir, { recursive: true, force: true }))

  test('first run starts a full trial; after it, unlicensed = view only, few projectors', () => {
    const m = mgr()
    assert.deepEqual([m.status().state, m.status().trialDaysLeft, m.status().restricted], ['trial', TRIAL_DAYS, false])
    m.check('10.0.0.1', 'control')
    t += (TRIAL_DAYS + 1) * DAY
    const s = m.status()
    assert.deepEqual([s.state, s.restricted], ['unlicensed', true])
    assert.throws(() => m.check('10.0.0.1', 'control'), (e: { code?: string }) => e.code === 'license')
    m.check('10.0.0.1', 'status')
    for (let i = 2; i <= FREE_LIMIT; i++) m.check(`10.0.0.${i}`, 'status')
    assert.throws(() => m.check('10.0.0.99', 'status'), (e: { code?: string }) => e.code === 'license')
  })

  test('a valid key lifts the restriction up to its projector count; expiry restricts again', () => {
    const m = mgr()
    assert.throws(() => m.install('nonsense'), (e: { code?: string }) => e.code === 'bad-request')
    const key = signLicense(PEM, { id: 'k1', licensee: 'ACME', max: 5, exp: new Date(t + 10 * DAY).toISOString() })
    const s = m.install(key)
    assert.deepEqual([s.state, s.licensee, s.maxProjectors, s.restricted], ['licensed', 'ACME', 5, false])
    // Máy mới (bộ nhớ "đang dùng" trống) — 5 máy được, máy thứ 6 thì không.
    const m2 = mgr()
    for (let i = 1; i <= 5; i++) m2.check(`10.1.0.${i}`, 'control')
    assert.throws(() => m2.check('10.1.0.6', 'control'), (e: { code?: string }) => e.code === 'license')
    t += 11 * DAY
    assert.deepEqual([m2.status().state, m2.status().restricted], ['expired', true])
    assert.throws(() => m2.check('10.1.0.1', 'control'), (e: { code?: string }) => e.code === 'license')
    assert.throws(() => m2.install(key), (e: { code?: string }) => e.code === 'bad-request') // khoá đã hết hạn không cài được
  })

  test('removing the key falls back to trial/unlicensed', () => {
    const m = mgr()
    assert.equal(m.remove().state, 'unlicensed')
  })
})

describe('machine binding and transfer', () => {
  let dir: string
  const A = 'AAAA-1111-BBBB-2222', B = 'CCCC-3333-DDDD-4444'
  const mgr = (mc: string) => createLicenseManager(dir, { publicKey: PUB, machineCode: mc })
  before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mikmaster-lic-mc-')) })
  after(() => fs.rmSync(dir, { recursive: true, force: true }))

  test('machine code is stable, formatted, and user input is normalised', () => {
    const c = computeMachineCode(dir)
    assert.match(c, /^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/)
    assert.equal(computeMachineCode(dir), c)
    assert.equal(normalizeMachineCode(' aaaa 1111-bbbb2222 '), A)
    assert.equal(normalizeMachineCode('xyz'), null)
  })

  test('a key bound to machine A installs on A only; release gives a receipt; a new key for B works', () => {
    const key = signLicense(PEM, { id: 'm1', licensee: 'ACME', max: 3, mc: A })
    assert.equal(verifyLicense(key, PUB)?.mc, A)
    assert.throws(() => mgr(B).install(key), (e: Error) => /another computer/.test(e.message))
    const onA = mgr(A)
    const s = onA.install(key)
    assert.deepEqual([s.state, s.bound, s.machineCode], ['licensed', true, A])

    const released = onA.remove()
    assert.notEqual(released.state, 'licensed')
    assert.deepEqual(parseReleaseCode(released.releaseCode!), { id: 'm1', mc: A, at: parseReleaseCode(released.releaseCode!)!.at })

    // Cấp lại cùng id cho máy B (scripts/license.mjs rebind làm việc này).
    const forB = signLicense(PEM, { id: 'm1', licensee: 'ACME', max: 3, mc: B })
    const onB = mgr(B)
    assert.equal(onB.install(forB).state, 'licensed')
    // Khoá của máy A copy sang B vẫn không dùng được; khoá không gắn máy thì dùng mọi nơi.
    assert.throws(() => mgr(B).install(key), (e: Error) => /another computer/.test(e.message))
    assert.equal(mgr(B).install(signLicense(PEM, { id: 'u1', licensee: 'Any', max: 0 })).bound, false)
  })

  test('a stored key for another machine does not count (e.g. the data folder was copied)', () => {
    const forA = signLicense(PEM, { id: 'm2', licensee: 'ACME', max: 0, mc: A })
    mgr(A).install(forA)
    const copied = mgr(B).status()
    assert.notEqual(copied.state, 'licensed')
  })
})

describe('license over HTTP', () => {
  let s: ReturnType<typeof createServer>, u: string, dir: string
  const sim = new PjlinkSimulator()
  let t = 2_000_000_000_000
  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mikmaster-lic-http-'))
    s = createServer({ store: createProjectStore(dir), license: createLicenseManager(dir, { now: () => t, publicKey: PUB }) })
    await new Promise<void>(r => s.listen(0, '127.0.0.1', r))
    u = `http://127.0.0.1:${(s.address() as AddressInfo).port}`
    await sim.start()
  })
  after(async () => { await sim.stop(); await new Promise(r => s.close(r)); fs.rmSync(dir, { recursive: true, force: true }) })
  const post = (p: string, body: unknown, method = 'POST') => fetch(u + p, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const target = { ip: '127.0.0.1', protocol: { type: 'pjlink-class2', port: 0 } }

  test('GET /api/license, then control is refused (402) once the trial is over; a key restores it', async () => {
    target.protocol.port = sim.port
    assert.equal((await (await fetch(`${u}/api/license`)).json() as any).state, 'trial')
    assert.equal((await post('/api/devices/command', { target, command: { kind: 'power', value: 'on' } })).status, 200)
    t += (TRIAL_DAYS + 1) * DAY
    const denied = await post('/api/devices/command', { target, command: { kind: 'power', value: 'standby' } })
    assert.equal(denied.status, 402)
    assert.equal(((await denied.json()) as any).error.code, 'license')
    assert.equal((await post('/api/devices/status', { target })).status, 200) // xem trạng thái vẫn được
    const bad = await post('/api/license', { key: 'nope' }, 'PUT')
    assert.equal(bad.status, 400)
    // Khoá thật của test: chỉ cài được nếu ký bằng khoá test → dùng payload ký bằng PEM test ở trên.
    const ok = await post('/api/license', { key: signLicense(PEM, { id: 'h1', licensee: 'HTTP Co', max: 0 }) }, 'PUT')
    assert.equal(ok.status, 200)
    assert.equal(((await ok.json()) as any).state, 'licensed')
    assert.equal((await post('/api/devices/command', { target, command: { kind: 'power', value: 'standby' } })).status, 200)
  })
})

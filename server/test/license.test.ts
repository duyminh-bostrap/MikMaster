import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { AddressInfo } from 'node:net'
import { after, before, describe, test } from 'node:test'
import { createServer } from '../src/http.ts'
import { FREE_LIMIT, TRIAL_DAYS, ONLINE_GRACE_DAYS, computeMachineCode, createLicenseManager, normalizeMachineCode, parseReleaseCode, signLicense, signLicenseV1, signStatusDoc, verifyLicense, verifyStatusDoc } from '../src/license.ts'
import { createProjectStore } from '../src/store.ts'
import { PjlinkSimulator } from '../src/sim/pjlinkSim.ts'

// Cặp khoá riêng cho test — không liên quan tới khoá thật.
const pair = crypto.generateKeyPairSync('ed25519')
const PEM = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string
const PUB = pair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
const DAY = 86_400_000

describe('license keys', () => {
  test('sign → verify roundtrip; another key or garbage fails', () => {
    const key = signLicense(PEM, { id: 'a1', licensee: 'ACME', max: 5 })
    assert.equal(verifyLicense(key, PUB)?.licensee, 'ACME')
    const other = crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
    assert.equal(verifyLicense(key, other), null)
    assert.equal(verifyLicense('garbage', PUB), null)
  })

  test('old MIKM1 format: editing the payload (e.g. max → 0) invalidates the signature', () => {
    const key = signLicenseV1(PEM, { id: 'a1', licensee: 'ACME', max: 5 })
    const [h, body, sig] = key.split('.')
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body!, 'base64url').toString()), max: 0 })).toString('base64url')
    assert.equal(verifyLicense(`${h}.${forged}.${sig}`, PUB), null)
  })
})

describe('compact key format', () => {
  const id = 'a1b2c3d4'
  test('MIKM2 is much shorter than the old JSON key and roundtrips every field', () => {
    const full = signLicense(PEM, { id, licensee: 'Cong ty ABC', max: 25, exp: '2027-06-30T00:00:00.000Z', mc: 'AAAA-1111-BBBB-2222' })
    const old = signLicenseV1(PEM, { id, licensee: 'Cong ty ABC', max: 25, exp: '2027-06-30T00:00:00.000Z', mc: 'AAAA-1111-BBBB-2222' })
    assert.ok(full.length < 140 && full.length < old.length * 0.65, `${full.length} vs ${old.length}`)
    const p = verifyLicense(full, PUB)!
    assert.deepEqual([p.v, p.id, p.licensee, p.max, p.mc], [2, id, 'Cong ty ABC', 25, 'AAAA-1111-BBBB-2222'])
    assert.equal(p.exp, '2027-06-30T23:59:59.999Z') // hết hạn vào cuối ngày
    const min = signLicense(PEM, { id, licensee: '', max: 0 })
    assert.ok(min.length < 115, String(min.length))
    assert.equal(verifyLicense(min, PUB)?.exp, undefined)
  })

  test('old MIKM1 keys still verify; pasted keys with line breaks work', () => {
    const old = signLicenseV1(PEM, { id: 'legacy1', licensee: 'Old', max: 2 })
    assert.equal(verifyLicense(old, PUB)?.licensee, 'Old')
    const k = signLicense(PEM, { id, licensee: 'Wrapped', max: 1 })
    assert.equal(verifyLicense(`${k.slice(0, 30)}\n  ${k.slice(30)}\n`, PUB)?.licensee, 'Wrapped')
  })

  test('forgery attempts fail: bit flips anywhere, truncated, wrong prefix, signature of another kind', () => {
    const k = signLicense(PEM, { id, licensee: 'ACME', max: 3 })
    const raw = Buffer.from(k.slice(6), 'base64url')
    for (let i = 0; i < raw.length; i += 3) {
      const bad = Buffer.from(raw); bad[i] = bad[i]! ^ 0x01
      assert.equal(verifyLicense(`MIKM2-${bad.toString('base64url')}`, PUB), null, `byte ${i}`)
    }
    assert.equal(verifyLicense(k.slice(0, -4), PUB), null)
    assert.equal(verifyLicense(k.replace('MIKM2', 'MIKM3'), PUB), null)
    // Chữ ký của file trạng thái / khoá cũ không dùng lại được làm khoá MIKM2.
    const status = signStatusDoc(PEM, [])
    assert.equal(verifyLicense(`MIKM2-${Buffer.from(status.split('.')[1]!, 'base64url').toString('base64url')}${status.split('.')[2]}`, PUB), null)
    // Đổi max của khoá hợp lệ bằng cách ghép chữ ký cũ vào dữ liệu mới.
    const body = raw.subarray(0, raw.length - 64), sig = raw.subarray(raw.length - 64)
    const richer = Buffer.from(body); richer[richer.length - 6 - 'ACME'.length + 1] = 0xff
    assert.equal(verifyLicense(`MIKM2-${Buffer.concat([richer, sig]).toString('base64url')}`, PUB), null)
    assert.throws(() => signLicense(PEM, { id: 'x'.repeat(13), licensee: '', max: 0 }))
    assert.throws(() => signLicense(PEM, { id, licensee: '', max: 70000 }))
  })
})

describe('tamper resistance of the local state', () => {
  let dir: string, mirror: string
  let t = 4_000_000_000_000
  const mk = (mc = 'AAAA-1111-BBBB-2222') => createLicenseManager(dir, { now: () => t, publicKey: PUB, mirrorDir: mirror, machineCode: mc, checkUrl: '' })
  before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mikmaster-lic-t-')); mirror = fs.mkdtempSync(path.join(os.tmpdir(), 'mikmaster-lic-m-')) })
  after(() => { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(mirror, { recursive: true, force: true }) })
  const files = () => [path.join(dir, 'state.dat'), path.join(mirror, 'state.dat')]

  test('deleting one copy of the state does not reset the trial; deleting both does (documented limit)', () => {
    mk()
    t += 20 * DAY
    assert.equal(mk().status().trialDaysLeft, TRIAL_DAYS - 20)
    fs.rmSync(files()[0]!)
    assert.equal(mk().status().trialDaysLeft, TRIAL_DAYS - 20) // khôi phục từ bản kia
    assert.ok(fs.existsSync(files()[0]!))
  })

  test('editing the state file (extending the trial) is detected → trial treated as ended', () => {
    const before = JSON.parse(fs.readFileSync(files()[0]!, 'utf8'))
    const d = JSON.parse(before.d); d.firstRun += 100 * DAY
    fs.writeFileSync(files()[0]!, JSON.stringify({ d: JSON.stringify(d), m: before.m }))
    const s = mk().status()
    assert.deepEqual([s.state, s.restricted], ['unlicensed', true])
  })

  test('a state file copied from another computer does not validate', () => {
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir); fs.rmSync(mirror, { recursive: true, force: true }); fs.mkdirSync(mirror)
    mk('AAAA-1111-BBBB-2222')
    const fresh = fs.readFileSync(files()[0]!)
    t += 40 * DAY // trial hết trên máy A…
    assert.equal(mk('AAAA-1111-BBBB-2222').status().state, 'unlicensed')
    // …chép file dùng thử "mới tinh" của máy khác (ký bằng mã máy khác) vào thì không được chấp nhận.
    const other = createLicenseManager(fs.mkdtempSync(path.join(os.tmpdir(), 'mikmaster-lic-o-')), { now: () => t, publicKey: PUB, mirrorDir: null, machineCode: 'CCCC-3333-DDDD-4444', checkUrl: '' })
    void other
    fs.writeFileSync(files()[0]!, fresh); fs.writeFileSync(files()[1]!, fresh)
    assert.equal(mk('CCCC-3333-DDDD-4444').status().state, 'unlicensed') // bản chép không khớp mã máy C → bị can thiệp
  })

  test('setting the clock back does not extend the trial or a key', () => {
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir); fs.rmSync(mirror, { recursive: true, force: true }); fs.mkdirSync(mirror)
    mk()
    t += 29 * DAY
    assert.equal(mk().status().trialDaysLeft, 1)
    const real = t
    t = real + 2 * DAY
    assert.equal(mk().status().state, 'unlicensed')
    t = real - 40 * DAY // kéo đồng hồ lùi 40 ngày
    assert.equal(mk().status().state, 'unlicensed')
    const m = mk()
    m.install(signLicense(PEM, { id: 'c1', licensee: 'ACME', max: 0, exp: new Date(real + 2 * DAY).toISOString() }))
    t = real + 3 * DAY
    assert.equal(m.status().state, 'expired')
    t = real - 30 * DAY
    assert.equal(mk().status().state, 'expired')
  })
})

describe('license policy', () => {
  let dir: string
  let t = 1_800_000_000_000
  const mgr = () => createLicenseManager(dir, { now: () => t, publicKey: PUB, mirrorDir: null })
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
  const mgr = (mc: string) => createLicenseManager(dir, { publicKey: PUB, mirrorDir: null, machineCode: mc })
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

describe('expiry warning and online verification (30 days)', () => {
  let dir: string
  let t = 3_000_000_000_000
  let doc = ''
  let online = true
  const fakeFetch = (async () => {
    if (!online) throw new Error('offline')
    return new Response(doc, { status: 200 })
  }) as unknown as typeof fetch
  const mgr = (url = 'https://example.test/license-status') => createLicenseManager(dir, { now: () => t, publicKey: PUB, mirrorDir: null, machineCode: 'AAAA-1111-BBBB-2222', checkUrl: url, fetch: fakeFetch })
  before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mikmaster-lic-on-')) })
  after(() => fs.rmSync(dir, { recursive: true, force: true }))

  test('status docs: signed, tamper-proof', () => {
    const d = signStatusDoc(PEM, ['x1'])
    assert.deepEqual(verifyStatusDoc(d, PUB)?.revoked, ['x1'])
    const mid = d.length - 30 // ký tự ở giữa chữ ký (ký tự cuối chỉ mang 4 bit hữu ích nên đổi nó có thể không đổi dữ liệu)
    assert.equal(verifyStatusDoc(`${d.slice(0, mid)}${d[mid] === 'A' ? 'B' : 'A'}${d.slice(mid + 1)}`, PUB), null)
    assert.equal(verifyStatusDoc(signLicense(PEM, { id: 'a', licensee: 'b', max: 0 }), PUB), null) // khoá license không phải file trạng thái
  })

  test('warns as the key nears its expiry (expiresInDays)', () => {
    const m = mgr()
    m.install(signLicense(PEM, { id: 'w1', licensee: 'ACME', max: 0, exp: new Date(t + 12 * DAY).toISOString() }))
    const s = m.status()
    assert.deepEqual([s.state, s.restricted], ['licensed', false])
    assert.ok(s.expiresInDays === 12 || s.expiresInDays === 13, `expiresInDays ${s.expiresInDays}`) // hạn tính tới cuối ngày
  })

  test('30 days without a successful online check → unverified (restricted); reconnecting restores it', async () => {
    const m = mgr()
    m.install(signLicense(PEM, { id: 'w1', licensee: 'ACME', max: 0 })) // không hết hạn; cài khoá = vừa kiểm tra
    doc = signStatusDoc(PEM, [])
    t += (ONLINE_GRACE_DAYS - 1) * DAY
    const near = m.status()
    assert.equal(near.state, 'licensed')
    assert.equal(near.online?.daysLeft, 1)
    t += 2 * DAY // đã quá 30 ngày kể từ lần kiểm tra cuối (lúc cài khoá)
    assert.equal(m.status().state, 'unverified')
    assert.throws(() => m.check('10.9.0.1', 'control'), (e: Error) => /online/.test(e.message))
    online = false
    const failed = await m.checkNow()
    assert.equal(failed.state, 'unverified')
    assert.match(failed.online?.lastError ?? '', /offline/)
    online = true
    const ok = await m.checkNow()
    assert.deepEqual([ok.state, ok.online?.lastError, ok.online?.daysLeft], ['licensed', undefined, ONLINE_GRACE_DAYS])
    m.check('10.9.0.1', 'control')
  })

  test('a revoked key is restricted; an unsigned or older status file is ignored', async () => {
    const m = mgr()
    doc = signStatusDoc(PEM, ['w1'])
    assert.equal((await m.checkNow()).state, 'revoked')
    doc = signStatusDoc(PEM, [], '2000-01-01T00:00:00.000Z') // cũ hơn file đã nhận → bỏ qua, vẫn thu hồi
    const stale = await m.checkNow()
    assert.equal(stale.state, 'revoked')
    assert.match(stale.online?.lastError ?? '', /older/)
    doc = 'not-signed'
    assert.match((await m.checkNow()).online?.lastError ?? '', /not signed/)
  })

  test('without a check URL the online rule is off (offline-verifiable key only)', () => {
    const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'mikmaster-lic-off-'))
    try {
      let n = t
      const m = createLicenseManager(d2, { now: () => n, publicKey: PUB, mirrorDir: null, machineCode: 'AAAA-1111-BBBB-2222', checkUrl: '' })
      m.install(signLicense(PEM, { id: 'o1', licensee: 'ACME', max: 0 }))
      n += 400 * DAY
      const s = m.status()
      assert.deepEqual([s.state, s.online?.configured], ['licensed', false])
    } finally { fs.rmSync(d2, { recursive: true, force: true }) }
  })
})

describe('license over HTTP', () => {
  let s: ReturnType<typeof createServer>, u: string, dir: string
  const sim = new PjlinkSimulator()
  let t = 2_000_000_000_000
  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mikmaster-lic-http-'))
    s = createServer({ store: createProjectStore(dir), license: createLicenseManager(dir, { now: () => t, publicKey: PUB, mirrorDir: null }) })
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

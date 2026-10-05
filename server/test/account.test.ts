import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, beforeEach, describe, test } from 'node:test'
import { createAccountManager } from '../src/account.ts'
import { createLicenseManager, signLicense } from '../src/license.ts'
import { FakeSupabase } from '../src/sim/supabaseSim.ts'

const DAY = 86_400_000
const pair = crypto.generateKeyPairSync('ed25519')
const PEM = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string
const PUB = pair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
const A = 'AAAA-1111-BBBB-2222', B = 'CCCC-3333-DDDD-4444'

describe('accounts (Supabase) + 30-day free trial per account and per machine', () => {
  const sb = new FakeSupabase()
  let dir: string
  let t = 1_900_000_000_000
  const mk = (machine = A, d = dir) => {
    const account = createAccountManager(d, { machineCode: machine, url: sb.url, anonKey: 'anon-key', now: () => t })
    const license = createLicenseManager(d, { now: () => t, publicKey: PUB, mirrorDir: null, machineCode: machine, checkUrl: '', account })
    return { account, license }
  }
  before(() => sb.start())
  after(() => sb.stop())
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mikmaster-acc-'))
    t = 1_900_000_000_000; sb.now = t
    sb.users.clear(); sb.trials = []; sb.tokens.clear(); sb.paid.clear(); sb.requireConfirm = false; sb.down = false; sb.requests = []
  })

  test('not configured → no gate, the old local trial applies', () => {
    const account = createAccountManager(dir, { machineCode: A, url: '', anonKey: '' })
    const license = createLicenseManager(dir, { localTrial: true, now: () => t, publicKey: PUB, mirrorDir: null, machineCode: A, checkUrl: '', account })
    const s = license.status()
    assert.deepEqual([account.configured, s.state, s.gate, s.account], [false, 'trial', false, undefined])
  })

  test('configured, signed out → gate (state signin), control refused', () => {
    const { license } = mk()
    const s = license.status()
    assert.deepEqual([s.state, s.restricted, s.gate, s.account?.signedIn], ['signin', true, true, false])
    assert.throws(() => license.requirePro('Live preview'), (e: Error) => /sign in/.test(e.message))
  })

  test('sign up claims the 30-day trial on this machine; the trial counts down', async () => {
    const { account, license } = mk()
    assert.equal(await account.signUp('a@example.com', 'secret1'), true)
    let s = license.status()
    assert.deepEqual([s.state, s.trialDaysLeft, s.gate, s.restricted, s.account?.email], ['trial', 30, false, false, 'a@example.com'])
    license.check('10.0.0.1', 'control')
    t += 10 * DAY; sb.now = t
    await account.refresh()
    assert.equal(license.status().trialDaysLeft, 20)
    t += 21 * DAY; sb.now = t
    await account.refresh()
    s = license.status()
    assert.deepEqual([s.state, s.gate], ['expired', true])
  })

  test('a different account on the same machine gets NO new trial; another machine gets nothing for the same account', async () => {
    const one = mk()
    await one.account.signUp('a@example.com', 'secret1')
    const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'mikmaster-acc2-'))
    try {
      const other = mk(A, d2)
      await other.account.signUp('b@example.com', 'secret2')
      const s = other.license.status()
      assert.deepEqual([s.state, s.gate, s.account?.kind], ['unlicensed', true, 'machine_used'])
      // Cùng tài khoản A đăng nhập ở máy B: trial thuộc máy A.
      const d3 = fs.mkdtempSync(path.join(os.tmpdir(), 'mikmaster-acc3-'))
      try {
        const machineB = mk(B, d3)
        await machineB.account.signIn('a@example.com', 'secret1')
        assert.equal(machineB.license.status().account?.kind, 'other_machine')
        assert.equal(machineB.license.status().gate, true)
      } finally { fs.rmSync(d3, { recursive: true, force: true }) }
    } finally { fs.rmSync(d2, { recursive: true, force: true }) }
  })

  test('the gate can be passed with an offline key even when the account has no trial', async () => {
    const one = mk()
    await one.account.signUp('a@example.com', 'secret1')
    const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'mikmaster-acc2-'))
    try {
      const other = mk(A, d2)
      await other.account.signUp('b@example.com', 'secret2')
      assert.equal(other.license.status().gate, true)
      other.license.install(signLicense(PEM, { id: 'k1', licensee: 'ACME', max: 0, mc: A }))
      const s = other.license.status()
      assert.deepEqual([s.state, s.gate, s.restricted], ['licensed', false, false])
    } finally { fs.rmSync(d2, { recursive: true, force: true }) }
  })

  test('email confirmation: sign up returns false, sign in before confirming is refused, then works', async () => {
    sb.requireConfirm = true
    const { account, license } = mk()
    assert.equal(await account.signUp('c@example.com', 'secret3'), false)
    await assert.rejects(account.signIn('c@example.com', 'secret3'), (e: { code?: string; message: string }) => e.code === 'auth' && /Confirm your email/.test(e.message))
    sb.users.get('c@example.com')!.confirmed = true
    await account.signIn('c@example.com', 'secret3')
    assert.equal(license.status().state, 'trial')
  })

  test('wrong password and already-registered email give clear errors', async () => {
    const { account } = mk()
    await account.signUp('a@example.com', 'secret1')
    account.signOut()
    await assert.rejects(account.signIn('a@example.com', 'nope'), (e: { code?: string; message: string }) => e.code === 'auth' && /Wrong email or password/.test(e.message))
    await assert.rejects(account.signUp('a@example.com', 'secret1'), (e: Error) => /already registered/.test(e.message))
  })

  test('sign out returns to the gate; the session survives a restart but not a copy to another machine', async () => {
    const { account } = mk()
    await account.signUp('a@example.com', 'secret1')
    assert.equal(mk().license.status().state, 'trial') // khởi động lại: đọc account.dat
    const raw = fs.readFileSync(path.join(dir, 'account.dat'), 'utf8')
    assert.ok(!raw.includes('a@example.com') && !raw.includes('rt-')) // mã hoá trên đĩa
    assert.equal(mk(B).license.status().state, 'signin') // chép sang máy khác: không giải mã được
    account.signOut()
    assert.equal(mk().license.status().state, 'signin')
    assert.ok(!fs.existsSync(path.join(dir, 'account.dat')))
  })

  test('offline: the last confirmed trial keeps working for 30 days, then the app asks to reconnect; reconnecting restores it', async () => {
    const { account, license } = mk()
    await account.signUp('a@example.com', 'secret1')
    await account.signIn('a@example.com', 'secret1') // quyền có hạn 30 ngày; cần còn hạn khi mạng trở lại
    sb.paid.set([...sb.users.values()][0]!.id, t + 400 * DAY) // gói trả phí dài hạn để tách riêng kiểm tra "30 ngày offline"
    await account.refresh()
    assert.equal(license.status().state, 'licensed')
    sb.down = true
    t += 25 * DAY
    await account.refresh()
    assert.equal(license.status().state, 'licensed') // vẫn trong hạn offline
    assert.ok(license.status().account?.lastError)
    t += 6 * DAY
    sb.now = t
    assert.equal(license.status().state, 'unverified') // quá 30 ngày chưa xác nhận với máy chủ
    assert.throws(() => license.requirePro('Live preview'), (e: Error) => /verified online/.test(e.message))
    sb.down = false
    await account.refresh()
    assert.equal(license.status().state, 'licensed')
  })

  test('a lifetime plan with an update period: builds released after it are outdated, earlier ones keep working', async () => {
    const { account } = mk()
    await account.signUp('a@example.com', 'secret1')
    sb.perpetual.set([...sb.users.values()][0]!.id, t + 100 * DAY)         // dùng vĩnh viễn, cập nhật thêm 100 ngày
    await account.refresh()
    const build = (msFromNow: number) => createLicenseManager(dir, { now: () => t, publicKey: PUB, mirrorDir: null, machineCode: A, checkUrl: '', account, buildDate: new Date(t + msFromNow).toISOString() })
    const ok = build(10 * DAY).status()
    assert.deepEqual([ok.state, ok.restricted, ok.expiresAt], ['licensed', false, undefined])
    assert.ok(ok.updatesInDays! >= 99 && ok.updatesInDays! <= 101)
    const outdated = build(400 * DAY).status()
    assert.deepEqual([outdated.state, outdated.restricted, outdated.gate], ['outdated', true, true])
  })

  test('the access token is refreshed automatically and requests never carry the password', async () => {
    const { account } = mk()
    await account.signUp('a@example.com', 'secret1')
    t += 2 * 3600_000 // access token hết hạn sau 1 giờ
    await account.refresh()
    assert.ok(sb.requests.some(r => r.includes('grant_type=refresh_token')))
    assert.equal(sb.requests.filter(r => r.includes('grant_type=password')).length, 0)
  })
})

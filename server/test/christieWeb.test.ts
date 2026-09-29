import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, test } from 'node:test'
import { christiePreview, resetChristieSessions } from '../src/drivers/christieWeb.ts'
import { ChristieWebSimulator, SIM_PNG } from '../src/sim/christieWebSim.ts'

describe('Christie web live preview (JSON-RPC /cgi-bin/c4jweb)', () => {
  const sim = new ChristieWebSimulator()
  before(() => sim.start())
  after(() => sim.stop())
  beforeEach(() => { resetChristieSessions(); sim.signal = 'image' })
  const target = (username?: string, password?: string) => ({ host: '127.0.0.1', port: 3002, timeoutMs: 1000, username, password })

  test('logs in, finds the active input and returns its thumbnail as a data URL', async () => {
    const r = await christiePreview(target('sim-operator', 'sim-pass'), sim.port)
    assert.equal(r.state, 'image')
    assert.equal(r.input, 'One-Port HDMI0')
    assert.equal(r.resolution, '1920x1080')
    assert.equal(r.image, `data:image/png;base64,${SIM_PNG.toString('base64')}`)
  })

  test('reuses the session; re-logs in once when it expired (error 116)', async () => {
    await christiePreview(target('sim-operator', 'sim-pass'), sim.port)
    const before = sim.requests.length
    await christiePreview(target('sim-operator', 'sim-pass'), sim.port)
    assert.deepEqual(sim.requests.slice(before), ['POST /cgi-bin/c4jweb', 'GET /cgi-bin/thumbnail'])
    sim.expireSessions()
    const r = await christiePreview(target('sim-operator', 'sim-pass'), sim.port)
    assert.equal(r.state, 'image')
  })

  test('no signal on the active input', async () => {
    sim.signal = 'no-signal'
    const r = await christiePreview(target('sim-operator', 'sim-pass'), sim.port)
    assert.deepEqual([r.state, r.image, r.input], ['no-signal', undefined, 'One-Port HDMI0'])
  })

  test('without an account or with a wrong one → auth error (nothing guessed)', async () => {
    await assert.rejects(christiePreview(target(), sim.port), (e: { code?: string }) => e.code === 'auth')
    await assert.rejects(christiePreview(target('sim-operator', 'wrong'), sim.port), (e: { code?: string }) => e.code === 'auth')
  })
})

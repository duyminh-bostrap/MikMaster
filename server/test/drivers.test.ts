import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { christieDriver } from '../src/drivers/christie.ts'
import { resetChristieSessions, setChristieWebPort } from '../src/drivers/christieWeb.ts'
import { ChristieWebSimulator } from '../src/sim/christieWebSim.ts'
import { inputFromCode, panasonicDriver, parseLightOutput, parseTemperature, percentToLightOutput, setPanasonicWebPort } from '../src/drivers/panasonic.ts'
import { parseSimpleStatus } from '../src/drivers/panasonicWeb.ts'
import crypto from 'node:crypto'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { pjlinkDriver } from '../src/drivers/pjlink.ts'
import type { DriverTarget } from '../src/drivers/types.ts'
import { DeviceError, splitParens } from '../src/net/tcp.ts'
import { ChristieSimulator } from '../src/sim/christieSim.ts'
import { PanasonicSimulator } from '../src/sim/panasonicSim.ts'
import { PjlinkSimulator } from '../src/sim/pjlinkSim.ts'

const target = (port: number, extra: Partial<DriverTarget> = {}): DriverTarget => ({ host: '127.0.0.1', port, timeoutMs: 1000, ...extra })

async function rejectsWith(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (err: unknown) => err instanceof DeviceError && err.code === code, `expected DeviceError(${code})`)
}

describe('splitParens', () => {
  test('splits frames and keeps ")" inside quotes', () => {
    const { frames, rest } = splitParens('(PWR!001 "On (ok)")\r\n(SHU!000 "Open")(PW')
    assert.deepEqual(frames, ['(PWR!001 "On (ok)")', '(SHU!000 "Open")'])
    assert.equal(rest, '(PW')
  })

  test('Christie reply with a space after "!" (as in the vendor notes) is parsed', async () => {
    const { christieDriver } = await import('../src/drivers/christie.ts')
    const net = await import('node:net')
    const srv = net.createServer(s => s.on('data', () => s.write('(PWR! 001 "On")')))
    await new Promise<void>(r => srv.listen(0, '127.0.0.1', r))
    const port = (srv.address() as import('node:net').AddressInfo).port
    const status = await christieDriver.status({ host: '127.0.0.1', port, timeoutMs: 800 }).catch(e => e)
    srv.close()
    // PWR on → driver also asks SHU; the fake server answers PWR again → SHU reply ignored, power still read.
    assert.equal(status.power, 'on')
  })
})

describe('PJLink driver', () => {
  const sim = new PjlinkSimulator({ name: 'Booth 1', manufacturer: 'Acme', model: 'X1' })
  const secured = new PjlinkSimulator({ password: 'secret' })
  before(async () => { await sim.start(); await secured.start() })
  after(async () => { await sim.stop(); await secured.stop() })

  test('standby status has no input/shutter (ERR3 tolerated)', async () => {
    sim.power = 0
    const s = await pjlinkDriver.status(target(sim.port))
    assert.equal(s.power, 'standby')
    assert.equal(s.input, undefined)
    assert.equal(s.lampHours, 1200)
  })

  test('power on, input, shutter round-trip', async () => {
    const t = target(sim.port)
    await pjlinkDriver.command(t, { kind: 'power', value: 'on' })
    await pjlinkDriver.command(t, { kind: 'input', input: 'HDMI 2' })
    await pjlinkDriver.command(t, { kind: 'shutter', closed: true })
    const s = await pjlinkDriver.status(t)
    assert.deepEqual([s.power, s.input, s.shutter], ['on', 'HDMI 2', true])
    await pjlinkDriver.command(t, { kind: 'power', value: 'off' })
    assert.equal(sim.power, 0)
  })

  test('ERST bits become readable errors', async () => {
    sim.power = 1
    sim.erst = '021000'
    const s = await pjlinkDriver.status(target(sim.port))
    assert.deepEqual(s.errors, ['Lamp error', 'High Temp warning'])
    sim.erst = '000000'
  })

  test('unmapped input is rejected before touching the device', async () => {
    await rejectsWith(pjlinkDriver.command(target(sim.port), { kind: 'input', input: 'Nope' }), 'unsupported')
  })

  test('probe reads identity', async () => {
    const p = await pjlinkDriver.probe('127.0.0.1', sim.port, 500)
    assert.deepEqual(p, { authRequired: false, name: 'Booth 1', manufacturer: 'Acme', model: 'X1' })
  })

  test('MD5 auth: correct password works, wrong one is an auth error', async () => {
    assert.equal((await pjlinkDriver.status(target(secured.port, { password: 'secret' }))).power, 'standby')
    await rejectsWith(pjlinkDriver.status(target(secured.port, { password: 'wrong' })), 'auth')
    assert.deepEqual(await pjlinkDriver.probe('127.0.0.1', secured.port, 500), { authRequired: true })
  })

  test('raw passes text through', async () => {
    assert.equal(await pjlinkDriver.raw(target(sim.port), '%1CLSS ?'), '%1CLSS=1')
  })
})

describe('Panasonic NTCONTROL driver', () => {
  const open = new PanasonicSimulator()
  const secured = new PanasonicSimulator({ credentials: { username: 'admin1', password: 'panasonic' } })
  before(async () => { await open.start(); await secured.start() })
  after(async () => { await open.stop(); await secured.stop() })

  test('sends the documented command strings', async () => {
    const t = target(open.port)
    await panasonicDriver.command(t, { kind: 'power', value: 'on' })
    await panasonicDriver.command(t, { kind: 'shutter', closed: true })
    await panasonicDriver.command(t, { kind: 'input', input: 'HDBaseT' })
    await panasonicDriver.command(t, { kind: 'osd', key: 'menu' })
    await panasonicDriver.command(t, { kind: 'osd', key: 'enter' })
    assert.deepEqual(open.received, ['PON', 'OSH:1', 'IIS:DL1', 'OMN', 'OEN'])
  })

  test('status maps replies back to app labels', async () => {
    const s = await panasonicDriver.status(target(open.port))
    assert.deepEqual([s.power, s.shutter, s.input], ['on', true, 'HDBaseT'])
  })

  test('standby: shutter/input queries (ERR3) are tolerated', async () => {
    await panasonicDriver.command(target(open.port), { kind: 'power', value: 'standby' })
    const s = await panasonicDriver.status(target(open.port))
    assert.deepEqual([s.power, s.shutter, s.input], ['standby', undefined, undefined])
  })

  test('temperature: QTM:0 (intake) is the main reading, QTM:1 (exhaust) in the sensor list; queries are throttled', async () => {
    const sim = new PanasonicSimulator({ temps: [28, 51] })
    await sim.start()
    try {
      await panasonicDriver.command(target(sim.port), { kind: 'power', value: 'on' })
      const s = await panasonicDriver.status(target(sim.port))
      assert.equal(s.temperatureC, 28)
      assert.deepEqual(s.temperatures, [{ name: 'Intake air', c: 28 }, { name: 'Exhaust air', c: 51 }])
      assert.deepEqual(sim.received.filter(c => c.startsWith('QTM')), ['QTM:0', 'QTM:1'])
      const again = await panasonicDriver.status(target(sim.port)) // < 30 s: không hỏi lại nhiệt độ
      assert.equal(again.temperatureC, undefined)
      assert.equal(sim.received.filter(c => c.startsWith('QTM')).length, 2)
    } finally { await sim.stop() }
  })

  test('parseSimpleStatus reads °C from the projector web status page (structure seen on a real PT-RQ35K), ignores °F', () => {
    const html = '<div class="contents_name">INTAKE&nbsp;AIR</div><div class="contents_string"><p class="top_p"><span class="temp_string_good">27°C</span><span class="temp_string_good">80°F</span></p></div>'
    assert.deepEqual(parseSimpleStatus(html), [{ name: 'Intake air', c: 27 }])
    assert.deepEqual(parseSimpleStatus('<span class="temp_string_warn">&nbsp;</span>'), [])
  })

  test('temperature from the projector web page (Digest login with the same account), preferred over QTM', async () => {
    const user = 'admin1', pass = 'panasonic', nonce = 'abc123'
    const md5 = (x: string) => crypto.createHash('md5').update(x).digest('hex')
    const web = http.createServer((req, res) => {
      const f = Object.fromEntries([...(req.headers.authorization ?? '').matchAll(/(\w+)=(?:"([^"]*)"|([^\s,]+))/g)].map(m => [m[1], m[2] ?? m[3]]))
      const ok = f.username === user && f.response === md5(`${md5(`${user}:WEB Zone:${pass}`)}:${nonce}:${f.nc}:${f.cnonce}:auth:${md5(`GET:${req.url}`)}`)
      if (!ok) return void res.writeHead(401, { 'WWW-Authenticate': `Digest realm="WEB Zone", nonce="${nonce}", algorithm="MD5", qop="auth"` }).end('no')
      res.writeHead(200, { 'Content-Type': 'text/html' }).end('<div class="contents_name">INTAKE AIR</div><span class="temp_string_good">27°C</span><span class="temp_string_good">80°F</span>')
    })
    await new Promise<void>(r => web.listen(0, '127.0.0.1', r))
    const sim = new PanasonicSimulator({ credentials: { username: user, password: pass }, temps: [99, 99] })
    await sim.start()
    setPanasonicWebPort((web.address() as AddressInfo).port)
    try {
      await panasonicDriver.command(target(sim.port, { username: user, password: pass }), { kind: 'power', value: 'on' })
      const s = await panasonicDriver.status(target(sim.port, { username: user, password: pass }))
      assert.equal(s.temperatureC, 27)
      assert.deepEqual(s.temperatures, [{ name: 'Intake air', c: 27 }])
      assert.equal(sim.received.filter(c => c.startsWith('QTM')).length, 0) // đã có từ web → không hỏi QTM
    } finally { setPanasonicWebPort(80); web.closeAllConnections(); await new Promise(r => web.close(r)); await sim.stop() }
  })

  test('temperature is also read while the projector is in STANDBY (the projector web page reports it then too)', async () => {
    const user = 'admin1', pass = 'panasonic', nonce = 'abc124'
    const md5 = (x: string) => crypto.createHash('md5').update(x).digest('hex')
    const web = http.createServer((req, res) => {
      const f = Object.fromEntries([...(req.headers.authorization ?? '').matchAll(/(\w+)=(?:"([^"]*)"|([^\s,]+))/g)].map(m => [m[1], m[2] ?? m[3]]))
      const ok = f.username === user && f.response === md5(`${md5(`${user}:WEB Zone:${pass}`)}:${nonce}:${f.nc}:${f.cnonce}:auth:${md5(`GET:${req.url}`)}`)
      if (!ok) return void res.writeHead(401, { 'WWW-Authenticate': `Digest realm="WEB Zone", nonce="${nonce}", algorithm="MD5", qop="auth"` }).end('no')
      res.writeHead(200, { 'Content-Type': 'text/html' }).end('<div class="contents_name">INTAKE AIR</div><span class="temp_string_good">26°C</span><span class="temp_string_good">78°F</span>')
    })
    await new Promise<void>(r => web.listen(0, '127.0.0.1', r))
    const sim = new PanasonicSimulator({ credentials: { username: user, password: pass } }) // máy KHÔNG bật: QPW → 000 (standby)
    await sim.start()
    setPanasonicWebPort((web.address() as AddressInfo).port)
    try {
      const s = await panasonicDriver.status(target(sim.port, { username: user, password: pass }))
      assert.equal(s.power, 'standby')
      assert.equal(s.temperatureC, 26)
      assert.deepEqual(s.temperatures, [{ name: 'Intake air', c: 26 }])
    } finally { setPanasonicWebPort(80); web.closeAllConnections(); await new Promise(r => web.close(r)); await sim.stop() }
  })

  test('brightness (LIGHT OUTPUT): set sends VXX:LOPI2=+nnnnn (value = % × 10, clamped to 50–1000) and the status reads it back as %', async () => {
    const sim = new PanasonicSimulator()
    await sim.start()
    try {
      const t = target(sim.port)
      await panasonicDriver.command(t, { kind: 'power', value: 'on' })
      await panasonicDriver.command(t, { kind: 'brightness', percent: 50 })
      await panasonicDriver.command(t, { kind: 'brightness', percent: 0 }) // dưới mức tối thiểu → kẹp 50 (5 %)
      await panasonicDriver.command(t, { kind: 'brightness', percent: 120 }) // trên 100 → kẹp 1000
      assert.deepEqual(sim.received.filter(c => c.startsWith('VXX:LOPI2')), ['VXX:LOPI2=+00500', 'VXX:LOPI2=+00050', 'VXX:LOPI2=+01000'])
      assert.equal(percentToLightOutput(33.3), '+00333')
      assert.equal(parseLightOutput('LOPI2=+00500'), 50)
      assert.equal(parseLightOutput('garbage'), undefined)
    } finally { await sim.stop() }
  })

  test('status reads brightness and the current test pattern; the pattern commands use OTS codes (unsupported app patterns are refused)', async () => {
    const sim = new PanasonicSimulator()
    await sim.start()
    try {
      const t = target(sim.port, { port: sim.port })
      await panasonicDriver.command(t, { kind: 'power', value: 'on' })
      let s = await panasonicDriver.status(t)
      assert.equal(s.brightness, 100)
      assert.deepEqual(s.testPattern, { enabled: false })
      await panasonicDriver.command(t, { kind: 'testPattern', enabled: true, pattern: 'color-bars' })
      await panasonicDriver.command(t, { kind: 'testPattern', enabled: true, pattern: 'grid' })
      await panasonicDriver.command(t, { kind: 'testPattern', enabled: false })
      assert.deepEqual(sim.received.filter(c => c.startsWith('OTS')), ['OTS:08', 'OTS:07', 'OTS:00'])
      await rejectsWith(panasonicDriver.command(t, { kind: 'testPattern', enabled: true, pattern: 'red' }), 'unsupported')
      sim.testPattern = '08'
      sim.lightOutput = 400
      await new Promise(r => setTimeout(r, 10)) // (chỉ để rõ ý: kết quả đọc được lưu đệm 10 giây — dùng khoá khác bên dưới)
      const other = new PanasonicSimulator(); await other.start()
      try {
        other.power = true; other.testPattern = '08'; other.lightOutput = 400
        s = await panasonicDriver.status(target(other.port))
        assert.equal(s.brightness, 40)
        assert.deepEqual(s.testPattern, { enabled: true, pattern: 'color-bars' })
      } finally { await other.stop() }
    } finally { await sim.stop() }
  })

  test('input: inputFromCode understands plain, prefixed, slot and DigitalLink codes; IIS sets the input', async () => {
    assert.equal(inputFromCode('HD1'), 'HDMI 1')
    assert.equal(inputFromCode('IIS:SD1'), 'SDI 1')
    assert.equal(inputFromCode('AU1,HD2'), 'HDMI 2')
    assert.equal(inputFromCode('AU1,DP1'), 'DisplayPort')
    assert.equal(inputFromCode('DL1:PC1'), 'HDBaseT')
    assert.equal(inputFromCode('???'), undefined)
    const sim = new PanasonicSimulator()
    await sim.start()
    try {
      const t = target(sim.port)
      await panasonicDriver.command(t, { kind: 'power', value: 'on' })
      await panasonicDriver.command(t, { kind: 'input', input: 'SDI 1' })
      assert.equal((await panasonicDriver.status(t)).input, 'SDI 1')
    } finally { await sim.stop() }
  })

  test('parseTemperature accepts plain integers in range only', () => {
    assert.equal(parseTemperature('0030'), 30)
    assert.equal(parseTemperature('+0045'), 45)
    assert.equal(parseTemperature('-0005'), -5)
    assert.equal(parseTemperature('9999'), undefined)
    assert.equal(parseTemperature('abc'), undefined)
    assert.equal(parseTemperature(''), undefined)
  })

  test('MD5 challenge auth with default and explicit credentials', async () => {
    assert.equal((await panasonicDriver.status(target(secured.port))).power, 'standby')
    assert.equal((await panasonicDriver.status(target(secured.port, { username: 'admin1', password: 'panasonic' }))).power, 'standby')
  })

  test('wrong password → auth error', async () => {
    await rejectsWith(panasonicDriver.status(target(secured.port, { username: 'admin1', password: 'bad' })), 'auth')
  })

  test('OSD keys without a verified command are unsupported', async () => {
    await rejectsWith(panasonicDriver.command(target(open.port), { kind: 'osd', key: 'back' }), 'unsupported')
  })

  test('sim rejects unknown command with ERR1 → device error', async () => {
    await rejectsWith(panasonicDriver.raw(target(open.port), 'ZZZ'), 'device')
  })

  test('probe: open device exposes model, protected one only auth flag', async () => {
    assert.deepEqual(await panasonicDriver.probe('127.0.0.1', open.port, 500), { authRequired: false, manufacturer: 'Panasonic', model: 'RQ35K' })
    assert.deepEqual(await panasonicDriver.probe('127.0.0.1', secured.port, 500), { authRequired: true, manufacturer: 'Panasonic' })
  })
})

describe('Christie SST status groups (replies captured from a real Griffyn 4K50-RGB)', () => {
  test('parseSst handles escaped parentheses and the degree sign', async () => {
    const { parseSst } = await import('../src/drivers/christie.ts')
    assert.deepEqual(parseSst('(SST+TEMP!002 000 "30 °C" "Air Intake Temperature \\(Temp 2\\)")'), { index: '002', value: '30 °C', label: 'Air Intake Temperature (Temp 2)' })
    assert.equal(parseSst('(65535 00000 ERR00102 "SST+LAMP: Cannot find status group")'), null)
  })

  test('inputFrom maps zero-based Christie port names', async () => {
    const { inputFrom } = await import('../src/drivers/christie.ts')
    assert.deepEqual(['One-Port HDMI0', 'One-Port HDMI1', 'Quad SDI2', 'One-Port DP0', 'Nothing'].map(inputFrom), ['HDMI 1', 'HDMI 2', undefined, 'DisplayPort', undefined])
  })

  test('status reads intake temperature, every sensor and projector hours', async () => {
    const sim = new ChristieSimulator()
    await sim.start()
    try {
      sim.power = 1
      const s = await christieDriver.status({ host: '127.0.0.1', port: sim.port, timeoutMs: 800 })
      assert.equal(s.power, 'on')
      assert.equal(s.temperatureC, 30)
      assert.deepEqual(s.temperatures?.map(x => x.c), [30, 47, 66])
      assert.equal(s.temperatures?.[0]?.name, 'Air Intake (Temp 2)')
      assert.equal(s.lampHours, 260) // Laser On Hours (SST+LGHT) trước Projector Hours
      assert.equal(s.input, 'HDMI 1')
      assert.equal(s.osd, true)
      assert.deepEqual(s.lens, { shiftH: -3, shiftV: -604, zoom: -50, focus: 273 })
    } finally { await sim.stop() }
  })
})

describe('Christie serial driver', () => {
  const sim = new ChristieSimulator()
  before(() => sim.start())
  after(() => sim.stop())

  test('power and shutter commands / status', async () => {
    const t = target(sim.port)
    await christieDriver.command(t, { kind: 'power', value: 'on' })
    await christieDriver.command(t, { kind: 'shutter', closed: true })
    assert.deepEqual(sim.received.slice(-2), ['(PWR 1)', '(SHU 1)'])
    const s = await christieDriver.status(t)
    assert.deepEqual([s.power, s.shutter], ['on', true])
    await christieDriver.command(t, { kind: 'power', value: 'off' })
    assert.equal((await christieDriver.status(t)).power, 'standby')
  })

  test('OSD menu keys are unsupported (unverified); changing the input needs the projector web account (nothing is guessed)', async () => {
    await rejectsWith(christieDriver.command(target(sim.port), { kind: 'input', input: 'HDMI 1' }), 'auth')
    await rejectsWith(christieDriver.command(target(sim.port), { kind: 'osd', key: 'menu' }), 'unsupported')
  })

  test('raw returns the device frame verbatim', async () => {
    assert.equal(await christieDriver.raw(target(sim.port), '(PWR?)'), '(PWR!000 "Standby Mode")')
    assert.equal(await christieDriver.raw(target(sim.port), '(XXX?)'), '(ERR "Unrecognized command")')
  })

  test('error frame from the projector becomes a device error', async () => {
    sim.power = 0 // shutter is unavailable in standby
    await rejectsWith(christieDriver.command(target(sim.port), { kind: 'shutter', closed: true }), 'device')
  })
})

describe('network failures', () => {
  test('closed port → connect error', async () => {
    await rejectsWith(pjlinkDriver.status(target(1)), 'connect')
  })

  test('device that never answers → timeout', async () => {
    const sim = new PanasonicSimulator()
    sim.silent = true
    await sim.start()
    try { await rejectsWith(panasonicDriver.status(target(sim.port, { timeoutMs: 250 })), 'timeout') } finally { await sim.stop() }
  })

  test('wrong protocol on the port → protocol error', async () => {
    const sim = new PjlinkSimulator()
    await sim.start()
    try { await rejectsWith(panasonicDriver.status(target(sim.port)), 'protocol') } finally { await sim.stop() }
  })
})

describe('Barco Pulse driver (JSON-RPC)', async () => {
  const { BarcoPulseSimulator } = await import('../src/sim/barcoPulseSim.ts')
  const { barcoPulseDriver } = await import('../src/drivers/barcoPulse.ts')
  const { splitJson } = await import('../src/net/tcp.ts')
  const sim = new BarcoPulseSimulator()
  before(() => sim.start())
  after(() => sim.stop())
  const t = () => ({ host: '127.0.0.1', port: sim.port, timeoutMs: 1500 })

  test('splitJson handles nested objects, strings with braces and partial frames', () => {
    const { frames, rest } = splitJson('{"a":{"b":"}{"}}\n[1,2]{"c":')
    assert.deepEqual(frames, ['{"a":{"b":"}{"}}', '[1,2]'])
    assert.equal(rest, '{"c":')
  })

  test('power on/off and shutter, skipping pushed notifications', async () => {
    await barcoPulseDriver.command(t(), { kind: 'power', value: 'on' })
    await barcoPulseDriver.command(t(), { kind: 'shutter', closed: true })
    assert.deepEqual(await barcoPulseDriver.status(t()), { power: 'on', shutter: true, errors: [] })
    assert.deepEqual(sim.received.slice(0, 2).map(r => r.method), ['system.poweron', 'property.set'])
    assert.deepEqual(sim.received[1]!.params, { property: 'optics.shutter.target', value: 'Closed' })
    await barcoPulseDriver.command(t(), { kind: 'power', value: 'standby' })
    assert.equal((await barcoPulseDriver.status(t())).power, 'standby')
  })

  test('JSON-RPC errors become device errors; input is not supported', async () => {
    await rejectsWith(barcoPulseDriver.raw(t(), 'no.such.method'), 'device')
    await rejectsWith(barcoPulseDriver.command(t(), { kind: 'input', input: 'HDMI 1' }), 'unsupported')
  })

  test('raw accepts "method {params}" and full JSON-RPC objects', async () => {
    assert.equal(await barcoPulseDriver.raw(t(), 'property.get {"property":"optics.shutter.target"}'), '"Closed"')
    assert.equal(await barcoPulseDriver.raw(t(), '{"jsonrpc":"2.0","method":"property.get","params":{"property":"system.state"},"id":5}'), '"standby"')
  })

  test('probe recognises a Pulse projector', async () => {
    assert.deepEqual(await barcoPulseDriver.probe('127.0.0.1', sim.port, 800), { authRequired: false, manufacturer: 'Barco' })
    assert.equal(await barcoPulseDriver.probe('127.0.0.1', 1, 300), null)
  })
})

describe('identifyDevice', async () => {
  const { identifyDevice } = await import('../src/identify.ts')
  // Cùng một máy trả lời cả PJLink (có model qua INF2) lẫn Panasonic NTCONTROL.
  const pj = new PjlinkSimulator({ name: 'Stage L', manufacturer: 'Panasonic', model: 'PT-RQ35K', password: 'pw' })
  const pana = new PanasonicSimulator()
  before(async () => { await pj.start(); await pana.start() })
  after(async () => { await pj.stop(); await pana.stop() })
  const ports = () => ({ 'pjlink-class1': pj.port, 'panasonic-nt-control': pana.port, 'christie-serial-ip': 1, 'barco-pulse': 1 })

  test('Panasonic answering both → PJLink (vendor advice), model and name read through PJLink with the login', async () => {
    const r = await identifyDevice('127.0.0.1', { password: 'pw' }, 800, ports())
    assert.deepEqual([r.found, r.protocol, r.port, r.model, r.name], [true, 'pjlink-class2', pj.port, 'PT-RQ35K', 'Stage L'])
  })

  test('without the PJLink password the model falls back to what the vendor protocol reports', async () => {
    const r = await identifyDevice('127.0.0.1', {}, 800, ports())
    assert.equal(r.found, true)
    assert.equal(r.name, undefined) // tên máy chỉ đọc được qua PJLink
    assert.equal(r.model, 'RQ35K') // Panasonic NTCONTROL không khoá báo model
  })

  test('PJLink only → reported as PJLink Class 2 with its model', async () => {
    const r = await identifyDevice('127.0.0.1', { password: 'pw' }, 800, { ...ports(), 'panasonic-nt-control': 1 })
    assert.deepEqual([r.protocol, r.model], ['pjlink-class2', 'PT-RQ35K'])
  })

  test('NTCONTROL needs a login but PJLink does not → picks PJLink (status readable without a password)', async () => {
    const open = new PjlinkSimulator({ name: 'HEXO', manufacturer: 'Panasonic', model: 'PT-RQ35K' })
    const locked = new PanasonicSimulator({ credentials: { username: 'admin1', password: 'secret' } })
    await open.start(); await locked.start()
    try {
      const r = await identifyDevice('127.0.0.1', {}, 800, { 'pjlink-class1': open.port, 'panasonic-nt-control': locked.port, 'christie-serial-ip': 1, 'barco-pulse': 1 })
      assert.deepEqual([r.protocol, r.port, r.model, r.name, r.authRequired], ['pjlink-class2', open.port, 'PT-RQ35K', 'HEXO', false])
    } finally { await open.stop(); await locked.stop() }
  })
})

describe('Christie input selection ((SIN idx) with idx from the input list of the projector web — as the Griffyn web page does)', () => {
  const serial = new ChristieSimulator()
  const web = new ChristieWebSimulator()
  before(async () => { await serial.start(); await web.start(); setChristieWebPort(web.port) })
  after(async () => { setChristieWebPort(undefined); resetChristieSessions(); await serial.stop(); await web.stop() })
  const t = (account = true) => ({ host: '127.0.0.1', port: serial.port, timeoutMs: 1000, ...(account ? { username: 'sim-operator', password: 'sim-pass' } : {}) })

  test('HDMI 2 → (SIN 26) (the idx the projector lists for "One-Port HDMI1"); HDMI 1 → (SIN 24)', async () => {
    await christieDriver.command(t(), { kind: 'input', input: 'HDMI 2' })
    await christieDriver.command(t(), { kind: 'input', input: 'HDMI 1' })
    assert.deepEqual(serial.received.filter(f => f.startsWith('(SIN ')), ['(SIN 26)', '(SIN 24)'])
  })

  test('an input the projector does not list is refused, and without the web account nothing is guessed', async () => {
    await rejectsWith(christieDriver.command(t(), { kind: 'input', input: 'SDI 2' }), 'unsupported')
    await rejectsWith(christieDriver.command(t(false), { kind: 'input', input: 'HDMI 2' }), 'auth')
    assert.equal(serial.received.filter(f => f.startsWith('(SIN ')).length, 2) // không có lệnh nào thêm
  })
})


import { createHash } from 'node:crypto'
import type { CommandDto, StatusDto } from '../../../shared/api.ts'
import { DeviceError, TcpConnection, serialize, splitOnCR } from '../net/tcp.ts'
import type { Driver, DriverTarget, ProbeResult } from './types.ts'

/**
 * Mã INPT của PJLink: chữ số đầu là loại (1 RGB, 2 Video, 3 Digital, 4 Storage, 5 Network),
 * chữ số sau là số thứ tự. Việc hãng nào gán HDMI 1 = 31 là quy ước phổ biến, không bắt buộc.
 */
const INPUT_CODES: Record<string, string> = {
  'HDMI 1': '31', 'HDMI 2': '32', DVI: '33', DisplayPort: '34', 'SDI 1': '35', 'SDI 2': '36', HDBaseT: '56',
}
const CODE_TO_INPUT = Object.fromEntries(Object.entries(INPUT_CODES).map(([label, code]) => [code, label]))

const ERR_TEXT: Record<string, string> = {
  ERR1: 'Command not supported by this projector',
  ERR2: 'Parameter out of range',
  ERR3: 'Not available right now (projector busy or in standby)',
  ERR4: 'Projector reports a failure',
}

interface Session {
  conn: TcpConnection
  prefix: string
  authRequired: boolean
}

async function open(t: DriverTarget): Promise<Session> {
  const conn = await TcpConnection.open(t.host, t.port, t.timeoutMs, splitOnCR)
  try {
    const greeting = await conn.read()
    if (greeting === 'PJLINK ERRA') throw new DeviceError('auth', 'PJLink authentication failed')
    const m = /^PJLINK ([01])(?: ([0-9a-fA-F]{8}))?$/.exec(greeting)
    if (!m) throw new DeviceError('protocol', `Not a PJLink device (got "${greeting.slice(0, 40)}")`)
    const authRequired = m[1] === '1'
    const prefix = authRequired ? createHash('md5').update(`${m[2]}${t.password ?? ''}`).digest('hex') : ''
    return { conn, prefix, authRequired }
  } catch (err) {
    conn.close()
    throw err
  }
}

async function request(s: Session, cmd: string, param = '?'): Promise<string> {
  s.conn.write(`${s.prefix}%1${cmd} ${param}\r`)
  const line = await s.conn.read()
  if (/^PJLINK ERRA/.test(line)) throw new DeviceError('auth', 'PJLink authentication failed')
  const m = /^%\d([A-Z0-9]{4})=(.*)$/.exec(line)
  if (!m || m[1] !== cmd) throw new DeviceError('protocol', `Unexpected PJLink reply "${line.slice(0, 40)}"`)
  const value = m[2] ?? ''
  if (value === 'ERRA') throw new DeviceError('auth', 'PJLink authentication failed')
  if (/^ERR[1-4]$/.test(value)) throw new DeviceError('device', ERR_TEXT[value] ?? value)
  return value
}

/** Một số lệnh không khả dụng lúc standby (ERR3) hoặc không được hỗ trợ (ERR1) → bỏ qua trường đó. */
async function optional<T>(task: Promise<T>): Promise<T | undefined> {
  try { return await task } catch (err) {
    if (err instanceof DeviceError && err.code === 'device') return undefined
    throw err
  }
}

function withSession<T>(t: DriverTarget, fn: (s: Session) => Promise<T>): Promise<T> {
  return serialize(`${t.host}:${t.port}`, async () => {
    const s = await open(t)
    try { return await fn(s) } finally { s.conn.close() }
  })
}

const POWER = { '0': 'standby', '1': 'on', '2': 'cooling', '3': 'warmup' } as const
const ERST_LABELS = ['Fan', 'Lamp', 'High Temp', 'Cover Open', 'Filter', 'Other'] as const

async function identity(s: Session): Promise<ProbeResult> {
  const name = await optional(request(s, 'NAME'))
  const manufacturer = await optional(request(s, 'INF1'))
  const model = await optional(request(s, 'INF2'))
  return { authRequired: s.authRequired, name: name || undefined, manufacturer: manufacturer || undefined, model: model || undefined }
}

export const pjlinkDriver: Driver = {
  status: t => withSession(t, async s => {
    const power = POWER[(await request(s, 'POWR')) as keyof typeof POWER]
    const status: StatusDto = { power, errors: [] }
    if (power === 'on') {
      const code = await optional(request(s, 'INPT'))
      if (code) status.input = CODE_TO_INPUT[code]
      const avmt = await optional(request(s, 'AVMT'))
      if (avmt) status.shutter = avmt === '11' || avmt === '31'
    }
    const erst = await optional(request(s, 'ERST'))
    if (erst) {
      for (let i = 0; i < ERST_LABELS.length; i++) {
        const level = erst[i]
        if (level === '2') status.errors.push(`${ERST_LABELS[i]} error`)
        else if (level === '1') status.errors.push(`${ERST_LABELS[i]} warning`)
      }
    }
    const lamp = await optional(request(s, 'LAMP'))
    if (lamp) {
      const nums = lamp.split(' ')
      let hours = 0
      for (let i = 0; i < nums.length; i += 2) hours += Number(nums[i]) || 0
      status.lampHours = hours
    }
    return status
  }),

  command: (t, c: CommandDto) => withSession(t, async s => {
    switch (c.kind) {
      case 'power': await request(s, 'POWR', c.value === 'on' ? '1' : '0'); return
      case 'shutter': await request(s, 'AVMT', c.closed ? '11' : '10'); return
      case 'input': {
        const code = INPUT_CODES[c.input]
        if (!code) throw new DeviceError('unsupported', `PJLink driver has no code for input "${c.input}"`)
        await request(s, 'INPT', code)
        return
      }
      case 'osd': throw new DeviceError('unsupported', 'PJLink has no OSD navigation commands')
    }
  }),

  raw: (t, text) => withSession(t, async s => {
    s.conn.write(`${s.prefix}${text.replace(/[\r\n]+$/, '')}\r`)
    return s.conn.read()
  }),

  async identify(t) {
    try { return await withSession(t, identity) } catch (err) {
      if (err instanceof DeviceError && err.code === 'auth') return { authRequired: true }
      return null
    }
  },

  async probe(host, port, timeoutMs) {
    let s: Session | undefined
    try {
      s = await open({ host, port, timeoutMs })
      return s.authRequired ? { authRequired: true } : await identity(s)
    } catch (err) {
      if (err instanceof DeviceError && err.code === 'auth') return { authRequired: true }
      return null
    } finally { s?.conn.close() }
  },
}

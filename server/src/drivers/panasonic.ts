import { createHash } from 'node:crypto'
import type { CommandDto, OsdKeyDto, StatusDto } from '../../../shared/api.ts'
import { DeviceError, TcpConnection, serialize, splitOnCR } from '../net/tcp.ts'
import type { Driver, DriverTarget, ProbeResult } from './types.ts'

/*
 * Panasonic NTCONTROL (PT-RQ35K, cổng 1024).
 *
 * Nguồn: ghi chú giao thức + danh sách lệnh trích từ PDF chính thức trong repo
 * aot93/Panasonic-Multi-Controller (bản gốc của Panasonic bị chặn ở môi trường phát triển,
 * nên CHƯA đối chiếu trực tiếp và CHƯA thử trên máy thật).
 *
 *   Banner : "NTCONTROL 0"  | "NTCONTROL 1 <8hex>" (MD5) | "NTCONTROL 2 <8hex>" (SHA-256)
 *   Băm    : hex(MD5("user:pass:challenge"))
 *   Khung  : [hash] + "00" + lệnh + CR;  phản hồi = "00" + dữ liệu;  lỗi = "ERR1..ERR5", "ERRA"
 *   Máy đóng kết nối sau mỗi phản hồi → mỗi lệnh là một chu trình connect→handshake→lệnh→đóng.
 *
 * Tài khoản mặc định của hãng (admin1 / panasonic) chỉ dùng khi người dùng chưa nhập gì.
 * Tài liệu tổng hợp do người dùng cung cấp (2026-09): xác nhận PON/POF/QPW/OSH:1-0/IIS:HD1, NTCONTROL 0/1,
 * tối thiểu 0,5 s giữa các lệnh, mã lỗi ER401/ER402.
 */
const DEFAULT_USER = 'admin1'
const DEFAULT_PASS = 'panasonic'

/** Nhãn InputSource → mã IIS. DisplayPort không có trên RQ35K. HD2/SD2 chưa xác minh. */
const INPUT_CODES: Record<string, string> = {
  'HDMI 1': 'HD1', 'HDMI 2': 'HD2', DVI: 'DVI', 'SDI 1': 'SD1', 'SDI 2': 'SD2', HDBaseT: 'DL1',
}
const CODE_TO_INPUT = Object.fromEntries(Object.entries(INPUT_CODES).map(([label, code]) => [code, label]))

const OSD_KEYS: Partial<Record<OsdKeyDto, string>> = {
  menu: 'OMN', enter: 'OEN', up: 'OCU', down: 'OCD', left: 'OCL', right: 'OCR',
}

const ERR_TEXT: Record<string, string> = {
  ERR1: 'Undefined command',
  ERR2: 'Parameter out of range',
  ERR3: 'Busy or unavailable (e.g. projector in standby)',
  ERR4: 'Timeout',
  ERR5: 'Wrong data length',
}

interface Banner { mode: string; challenge: string }

function parseBanner(line: string): Banner {
  const m = /^NTCONTROL (\d)(?: ([0-9a-fA-F]+))?$/.exec(line)
  if (!m) throw new DeviceError('protocol', `Not a Panasonic NTCONTROL device (got "${line.slice(0, 40)}")`)
  return { mode: m[1]!, challenge: m[2] ?? '' }
}

function authPrefix(b: Banner, t: DriverTarget): string {
  if (b.mode === '0') return ''
  const algo = b.mode === '2' ? 'sha256' : 'md5'
  return createHash(algo).update(`${t.username || DEFAULT_USER}:${t.password ?? DEFAULT_PASS}:${b.challenge}`).digest('hex')
}

function parseReply(reply: string): string {
  if (/^ERRA/.test(reply)) {
    const lock = /^ERRA\s+(\d+)/.exec(reply)
    throw new DeviceError('auth', lock ? `Password rejected — device locked for ${lock[1]}s` : 'Username or password rejected')
  }
  if (/^ERR\d$/.test(reply)) throw new DeviceError('device', ERR_TEXT[reply] ?? reply)
  // Mã lỗi dạng ER401 / ER402 (lệnh không nhận / sai tham số / máy đang bận).
  if (/^ER\d{3}/.test(reply)) throw new DeviceError('device', `Command not accepted (${reply.slice(0, 5)}): wrong parameter or projector busy`)
  return reply.startsWith('00') ? reply.slice(2) : reply
}

/** Tài liệu hãng: cần tối thiểu 0,5 s giữa hai lệnh gửi tới một máy. */
const MIN_GAP_MS = 500
const lastCommandAt = new Map<string, number>()

/** Một chu trình đầy đủ cho một lệnh. */
function exchange(t: DriverTarget, command: string): Promise<string> {
  const key = `${t.host}:${t.port}`
  return serialize(key, async () => {
    const wait = (lastCommandAt.get(key) ?? 0) + MIN_GAP_MS - Date.now()
    if (wait > 0) await new Promise(r => setTimeout(r, wait))
    lastCommandAt.set(key, Date.now())
    const conn = await TcpConnection.open(t.host, t.port, t.timeoutMs, splitOnCR)
    try {
      const banner = parseBanner(await conn.read())
      conn.write(`${authPrefix(banner, t)}00${command}\r`)
      return parseReply(await conn.read())
    } finally { conn.close() }
  })
}

async function optional<T>(task: Promise<T>): Promise<T | undefined> {
  try { return await task } catch (err) {
    if (err instanceof DeviceError && err.code === 'device') return undefined
    throw err
  }
}

export const panasonicDriver: Driver = {
  async status(t) {
    // Power trước: nếu máy không trả lời hoặc sai mật khẩu thì dừng ngay, không gửi thêm lần thử nào.
    const qpw = await exchange(t, 'QPW')
    const status: StatusDto = { power: qpw.endsWith('1') ? 'on' : 'standby', errors: [] }
    if (status.power === 'on') {
      const qsh = await optional(exchange(t, 'QSH'))
      if (qsh !== undefined) status.shutter = qsh.endsWith('1')
      const qin = await optional(exchange(t, 'QIN'))
      if (qin) status.input = CODE_TO_INPUT[qin.replace(/^IIS:/, '')]
    }
    return status
  },

  async command(t, c: CommandDto) {
    switch (c.kind) {
      case 'power': await exchange(t, c.value === 'on' ? 'PON' : 'POF'); return
      case 'shutter': await exchange(t, `OSH:${c.closed ? 1 : 0}`); return
      case 'input': {
        const code = INPUT_CODES[c.input]
        if (!code) throw new DeviceError('unsupported', `PT-RQ35K has no input "${c.input}"`)
        await exchange(t, `IIS:${code}`)
        return
      }
      case 'osd': {
        const code = OSD_KEYS[c.key]
        if (!code) throw new DeviceError('unsupported', `OSD key "${c.key}" has no verified command`)
        await exchange(t, code)
        return
      }
    }
  },

  raw: (t, text) => exchange(t, text.replace(/[\r\n]+$/, '').replace(/^00/, '')),

  async probe(host, port, timeoutMs) {
    let conn: TcpConnection | undefined
    try {
      conn = await TcpConnection.open(host, port, timeoutMs, splitOnCR)
      const banner = parseBanner(await conn.read(timeoutMs))
      const found: ProbeResult = { authRequired: banner.mode !== '0', manufacturer: 'Panasonic' }
      if (!found.authRequired) {
        conn.write('00QID\r') // Query projector type
        const reply = await conn.read(timeoutMs).catch(() => '')
        if (reply && !/^ER/.test(reply)) found.model = reply.replace(/^00/, '')
      }
      return found
    } catch { return null } finally { conn?.close() }
  },
}

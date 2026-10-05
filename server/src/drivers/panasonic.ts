import { createHash } from 'node:crypto'
import type { CommandDto, OsdKeyDto, StatusDto } from '../../../shared/api.ts'
import { DeviceError, TcpConnection, serialize, splitOnCR } from '../net/tcp.ts'
import { panasonicWebTemperatures } from './panasonicWeb.ts'
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

/**
 * Độ sáng = LIGHT OUTPUT (bảng lệnh RS-232C của RQ35K2, 2025-08): đặt `VXX:LOPI2=+00500`, hỏi `QVX:LOPI2` → `LOPI2=+00500`;
 * giá trị 50–1000 (bảng ghi min 8 % … max 100 %). Quy ước ở đây: % = giá trị / 10, kẹp trong khoảng máy cho phép. CHƯA kiểm trên máy thật.
 */
export const LIGHT_OUTPUT = { min: 50, max: 1000 } as const

export function percentToLightOutput(percent: number): string {
  const v = Math.min(LIGHT_OUTPUT.max, Math.max(LIGHT_OUTPUT.min, Math.round(percent * 10)))
  return `+${String(v).padStart(5, '0')}`
}

export function parseLightOutput(reply: string): number | undefined {
  const m = /LOPI2=([+-]?\d+)/.exec(reply)
  if (!m) return undefined
  return Math.min(100, Math.max(0, Math.round(Number(m[1]) / 10)))
}

/**
 * Test pattern (OTS:nn đặt, QTS hỏi → nn): 00 tắt · 01 trắng · 02 đen · 05 cửa sổ · 06 cửa sổ đảo · 07 cross hatch · 08 color bar · 32/33/34 focus ·
 * 52 color bar side · 59 16:9/4:3 · 70–75 focus màu · 78 focus · 87 circle. Mẫu của app không có trong bảng (red / green / blue / gray ramp / crosshair) → không hỗ trợ.
 */
const TEST_PATTERN_CODES: Record<string, string> = { white: '01', black: '02', crosshatch: '07', grid: '07', 'color-bars': '08', focus: '78' }
const CODE_TO_PATTERN: Record<string, string> = { '01': 'white', '02': 'black', '07': 'crosshatch', '08': 'color-bars', '78': 'focus' }

/** Mã input máy báo (`HD1`, `IIS:HD1`, `AU1,HD2`, `DL1:HD1`…) → nhãn của app. */
export function inputFromCode(raw: string): string | undefined {
  const code = raw.replace(/^IIS:/, '').trim()
  if (/^DL1/.test(code)) return CODE_TO_INPUT.DL1
  const last = code.split(',').pop()!.split(':')[0]!
  return CODE_TO_INPUT[last] ?? ({ DV1: 'DVI', DP1: 'DisplayPort' } as Record<string, string>)[last]
}

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

/**
 * Nhiệt độ: QTM:0 = khí vào, QTM:1 = khí thoát (bảng lệnh RS-232C, mục TEMPERATURE). Phản hồi là số nguyên (vd. "0030" = 30 °C)
 * — CHƯA đối chiếu trên máy thật (RQ35K đòi đăng nhập). Giá trị ngoài -20..150 bị bỏ.
 */
export function parseTemperature(reply: string): number | undefined {
  const m = /^[-+]?\d{1,4}$/.exec(reply.trim())
  if (!m) return undefined
  const n = Number(m[0])
  return n >= -20 && n <= 150 ? n : undefined
}

/** Hỏi nhiệt độ tốn 2 lệnh (mỗi lệnh ≥ 0,5 s) nên chỉ hỏi lại sau chừng này thời gian; giữa hai lần app giữ số cũ. */
const TEMP_EVERY_MS = 30_000
const lastTempAt = new Map<string, number>()

/** Độ sáng và test pattern hiện tại: hỏi tối đa 10 giây một lần (mỗi lệnh ≥ 0,5 s); giữa hai lần dùng giá trị đã đọc. */
const EXTRA_EVERY_MS = 10_000
const lastExtraAt = new Map<string, number>()
const lastExtra = new Map<string, Pick<StatusDto, 'brightness' | 'testPattern'>>()

async function readExtras(t: DriverTarget, status: StatusDto): Promise<void> {
  const key = `${t.host}:${t.port}`
  if (Date.now() - (lastExtraAt.get(key) ?? 0) >= EXTRA_EVERY_MS) {
    lastExtraAt.set(key, Date.now())
    const extra: Pick<StatusDto, 'brightness' | 'testPattern'> = {}
    const lop = await optional(exchange(t, 'QVX:LOPI2'))
    const b = lop === undefined ? undefined : parseLightOutput(lop)
    if (b !== undefined) extra.brightness = b
    const qts = await optional(exchange(t, 'QTS'))
    const code = qts === undefined ? undefined : /^(\d{2})$/.exec(qts.trim())?.[1]
    if (code !== undefined) extra.testPattern = { enabled: code !== '00', ...(CODE_TO_PATTERN[code] ? { pattern: CODE_TO_PATTERN[code] } : {}) }
    lastExtra.set(key, extra)
  }
  Object.assign(status, lastExtra.get(key))
}

async function readTemperatures(t: DriverTarget, status: StatusDto): Promise<void> {
  const key = `${t.host}:${t.port}`
  if (Date.now() - (lastTempAt.get(key) ?? 0) < TEMP_EVERY_MS) return
  lastTempAt.set(key, Date.now())
  // 1) Trang web của máy (cấu trúc đã thấy trên máy thật) — cùng tài khoản với NTCONTROL; 2) lệnh QTM qua NTCONTROL.
  let sensors: { name: string; c: number }[] = await panasonicWebTemperatures(t, webPort).catch(() => [])
  if (!sensors.length) {
    for (const [code, name] of [['QTM:0', 'Intake air'], ['QTM:1', 'Exhaust air']] as const) {
      const c = parseTemperature((await optional(exchange(t, code))) ?? '')
      if (c !== undefined) sensors.push({ name, c })
    }
  }
  if (!sensors.length) return
  status.temperatures = sensors
  status.temperatureC = sensors[0]!.c // nhiệt độ chính = khí vào (giống Christie)
}

/** Cổng web của máy (chỉ đổi trong test). */
let webPort = 80
export function setPanasonicWebPort(port: number): void { webPort = port }

export const panasonicDriver: Driver = {
  async status(t) {
    // Power trước: nếu máy không trả lời hoặc sai mật khẩu thì dừng ngay, không gửi thêm lần thử nào.
    const qpw = await exchange(t, 'QPW')
    const status: StatusDto = { power: qpw.endsWith('1') ? 'on' : 'standby', errors: [] }
    if (status.power === 'on') {
      const qsh = await optional(exchange(t, 'QSH'))
      if (qsh !== undefined) status.shutter = qsh.endsWith('1')
      const qin = await optional(exchange(t, 'QIN'))
      if (qin) status.input = inputFromCode(qin)
    }
    await readExtras(t, status)
    // Nhiệt độ đọc CẢ KHI MÁY ĐANG CHỜ: trang web của RQ35K vẫn báo "INTAKE AIR" ở STANDBY (thấy trên máy thật, 2026-10-01).
    await readTemperatures(t, status)
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
      case 'brightness': await exchange(t, `VXX:LOPI2=${percentToLightOutput(c.percent)}`); return
      case 'testPattern': {
        if (!c.enabled) { await exchange(t, 'OTS:00'); return }
        const code = TEST_PATTERN_CODES[c.pattern ?? 'crosshatch']
        if (!code) throw new DeviceError('unsupported', `PT-RQ35K has no "${c.pattern}" test pattern (available: ${Object.keys(TEST_PATTERN_CODES).join(', ')})`)
        await exchange(t, `OTS:${code}`)
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

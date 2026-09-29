import type { CommandDto, LensReadingDto, StatusDto } from '../../../shared/api.ts'
import { DeviceError, TcpConnection, serialize, splitParens } from '../net/tcp.ts'
import type { Driver, DriverTarget, ProbeResult } from './types.ts'

/*
 * Christie serial-over-IP (Griffyn, cổng 3002).
 *
 * Nguồn: thư viện christie-mseries (dòng M) và kết quả tìm kiếm tài liệu Christie.
 * ĐÃ hỏi thử (chỉ lệnh "?") trên Griffyn 4K50-RGB thật, firmware griffyn 1.3.7 (2026-09-29):
 * PWR? SHU? SIN? CHA? ITP? OSD? và nhóm trạng thái SST+TEMP / SST+SYST / SST+LGHT / SST+CONF / SST+SIGN.
 *   Không có trên Griffyn (ERR00101 "Control Not Found"): LPP, LOP, BRT, CON — độ sáng laser chưa tìm được lệnh.
 *   `(SST+TEMP?)` → nhiều khung `(SST+TEMP!002 000 "30 °C" "Air Intake Temperature \(Temp 2\)")`
 *   `(SST+SYST?)` → … `(SST+SYST!000 000 "466:50 \(h:m\)" "Projector Hours")` …
 *
 *   Lệnh    : "(PWR 1)" đặt (dữ liệu cách mã một dấu cách), "(PWR?)" hỏi — mã 3 chữ, có thể kèm subcode "(FUNC+SUBC ...)"
 *   Phản hồi: `(PWR!000 "Standby Mode")` hoặc `(PWR! 001 "On")` — mã, "!", giá trị số độ dài cố định, mô tả
 *   (Tài liệu tổng hợp do người dùng cung cấp, 2026-09: xác nhận PWR 1/0, SHU 1 = đóng / 0 = mở, cổng 3002.)
 *
 * Các điểm chưa chắc, cố ý tách riêng để sửa một chỗ khi có tài liệu Griffyn:
 *   - POWER_STATE: ý nghĩa các giá trị số ngoài 0/1 → suy từ phần mô tả.
 *   - SHUTTER_CLOSED: (SHU1) = đóng, (SHU0) = mở.
 */
/** Đã hỏi thử trên Griffyn 4K50 thật: `(LHO!-003)` `(LVO!-604)` `(ZOM!-050)` `(FCS!273)`. */
const LENS_QUERIES = [['LHO', 'shiftH'], ['LVO', 'shiftV'], ['ZOM', 'zoom'], ['FCS', 'focus']] as const satisfies readonly (readonly [string, keyof LensReadingDto])[]

const SHUTTER_CLOSED = '1'
const SHUTTER_OPEN = '0'

interface Reply { code: string; value: string; description: string }

function parseFrame(frame: string): Reply {
  const m = /^\(([A-Z]{3}(?:\+[A-Z0-9]{4})?)!\s*([^\s")]*)(?:\s+"(.*)")?\s*\)$/.exec(frame)
  if (!m) throw new DeviceError('device', `Projector replied ${frame.slice(0, 80)}`)
  return { code: m[1]!, value: m[2] ?? '', description: m[3] ?? '' }
}

function exchange(t: DriverTarget, text: string): Promise<string> {
  return serialize(`${t.host}:${t.port}`, async () => {
    const conn = await TcpConnection.open(t.host, t.port, t.timeoutMs, splitParens)
    try {
      conn.write(text)
      return await conn.read()
    } finally { conn.close() }
  })
}

/** Nhóm trạng thái SST trả về nhiều khung, không có khung kết thúc → đọc tới khi máy ngừng gửi. */
const SST_IDLE_MS = 250

function exchangeMany(t: DriverTarget, text: string): Promise<string[]> {
  return serialize(`${t.host}:${t.port}`, async () => {
    const conn = await TcpConnection.open(t.host, t.port, t.timeoutMs, splitParens)
    try {
      conn.write(text)
      const frames = [await conn.read()]
      for (;;) {
        const next = await conn.read(SST_IDLE_MS).catch(() => undefined)
        if (next === undefined) return frames
        frames.push(next)
      }
    } finally { conn.close() }
  })
}

export interface SstItem { index: string; value: string; label: string }

/** `(SST+TEMP!002 000 "30 °C" "Air Intake Temperature \(Temp 2\)")` → { index, value, label } (bỏ khung lỗi). */
export function parseSst(frame: string): SstItem | null {
  const q = '"((?:[^"\\\\]|\\\\.)*)"'
  const m = new RegExp(`^\\(SST\\+[A-Z]{4}!(\\d+)\\s+\\d+\\s+${q}\\s+${q}\\s*\\)$`).exec(frame)
  if (!m) return null
  const unescape = (x: string) => x.replace(/\\(.)/g, '$1').trim()
  return { index: m[1]!, value: unescape(m[2]!), label: unescape(m[3]!) }
}

async function sst(t: DriverTarget, group: string): Promise<SstItem[]> {
  const frames = await exchangeMany(t, `(SST+${group}?)`)
  return frames.map(parseSst).filter((x): x is SstItem => x !== null)
}

/** Nhiệt độ các cảm biến; nhiệt độ chính = khí vào (Air Intake), không có thì cảm biến đầu tiên. */
export function temperaturesFrom(items: SstItem[]): { main?: number; sensors: { name: string; c: number }[] } {
  const sensors = items.flatMap(i => {
    // Máy gửi "°" dạng UTF-8; kết nối đọc latin1 nên có thể thành "Â°".
    const m = /(-?\d+(?:\.\d+)?)\s*(?:Â?°)?\s*C\b/.exec(i.value)
    return m ? [{ name: i.label.replace(/\s*Temperature\b/i, '').trim(), c: Number(m[1]) }] : []
  })
  const main = (sensors.find(s => /intake/i.test(s.name)) ?? sensors[0])?.c
  return { main, sensors }
}

/** Giờ nguồn sáng: "Laser On Hours" (SST+LGHT, "260.3") hoặc "Projector Hours" (SST+SYST, "466:50 (h:m)"). */
export function hoursFrom(items: SstItem[], label: RegExp): number | undefined {
  const item = items.find(i => label.test(i.label))
  const m = item && /^\s*(\d+)/.exec(item.value)
  return m ? Number(m[1]) : undefined
}

/**
 * `(SIN!001 "One-Port HDMI0")` → nhãn input của app. Cổng Christie đánh số từ 0 (HDMI0 = "HDMI Port 1").
 * Chỉ để ĐỌC; đổi input cần bảng số SIN của từng cấu hình cổng — chưa xác minh.
 */
export function inputFrom(description: string): string | undefined {
  const m = /(HDMI|SDI|DP|DisplayPort|HDBaseT)\s*(\d)?\s*$/i.exec(description)
  if (!m) return undefined
  const kind = m[1]!.toUpperCase(), n = Number(m[2] ?? 0) + 1
  if (kind === 'HDMI') return n <= 2 ? `HDMI ${n}` : undefined
  if (kind === 'SDI') return n <= 2 ? `SDI ${n}` : undefined
  if (kind === 'DP' || kind === 'DISPLAYPORT') return 'DisplayPort'
  return 'HDBaseT'
}

async function query(t: DriverTarget, code: string): Promise<Reply> {
  return parseFrame(await exchange(t, `(${code}?)`))
}

function powerState(r: Reply): StatusDto['power'] {
  const n = Number(r.value)
  if (n === 1) return 'on'
  if (n === 0) return 'standby'
  if (/cool/i.test(r.description)) return 'cooling'
  if (/warm|power ?up/i.test(r.description)) return 'warmup'
  return undefined
}

export const christieDriver: Driver = {
  async status(t) {
    const status: StatusDto = { errors: [] }
    const power = await query(t, 'PWR')
    status.power = powerState(power)
    if (status.power === 'on') {
      const shu = await query(t, 'SHU').catch(err => {
        if (err instanceof DeviceError && err.code === 'device') return undefined
        throw err
      })
      if (shu) status.shutter = shu.value.replace(/^0+(?=\d)/, '') === SHUTTER_CLOSED
      const sin = await query(t, 'SIN').catch(() => undefined)
      if (sin) status.input = inputFrom(sin.description)
    }
    // Vị trí ống kính (chỉ hỏi "?", không bao giờ gửi lệnh di chuyển): `(LHO!-003)` → -3.
    const lens: LensReadingDto = {}
    for (const [code, key] of LENS_QUERIES) {
      const r = await query(t, code).catch(() => undefined)
      const n = r && /^[+-]?\d+$/.test(r.value) ? Number(r.value) : NaN
      if (Number.isFinite(n)) lens[key] = n
    }
    if (Object.keys(lens).length > 0) status.lens = lens
    // Số liệu phụ: lỗi (máy cũ không có nhóm SST) chỉ làm thiếu số liệu, không hỏng trạng thái.
    const temps = await sst(t, 'TEMP').then(temperaturesFrom, () => undefined)
    if (temps?.main !== undefined) status.temperatureC = temps.main
    if (temps?.sensors.length) status.temperatures = temps.sensors
    const hours = await sst(t, 'LGHT').then(i => hoursFrom(i, /laser on hours/i), () => undefined)
      ?? await sst(t, 'SYST').then(i => hoursFrom(i, /projector hours/i), () => undefined)
    if (hours !== undefined) status.lampHours = hours
    return status
  },

  async command(t, c: CommandDto) {
    switch (c.kind) {
      case 'power': parseFrame(await exchange(t, `(PWR ${c.value === 'on' ? 1 : 0})`)); return
      case 'shutter': parseFrame(await exchange(t, `(SHU ${c.closed ? SHUTTER_CLOSED : SHUTTER_OPEN})`)); return
      case 'input': throw new DeviceError('unsupported', 'Christie input/channel mapping is not verified for Griffyn')
      case 'osd': throw new DeviceError('unsupported', 'Christie OSD navigation has no verified command')
    }
  },

  raw: (t, text) => exchange(t, text.trim()),

  async probe(host, port, timeoutMs) {
    let conn: TcpConnection | undefined
    try {
      conn = await TcpConnection.open(host, port, timeoutMs, splitParens)
      conn.write('(PWR?)')
      parseFrame(await conn.read(timeoutMs))
      return { authRequired: false, manufacturer: 'Christie' } satisfies ProbeResult
    } catch { return null } finally { conn?.close() }
  },
}

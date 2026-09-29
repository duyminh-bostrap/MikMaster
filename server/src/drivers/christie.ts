import type { CommandDto, StatusDto } from '../../../shared/api.ts'
import { DeviceError, TcpConnection, serialize, splitParens } from '../net/tcp.ts'
import type { Driver, DriverTarget, ProbeResult } from './types.ts'

/*
 * Christie serial-over-IP (Griffyn, cổng 3002).
 *
 * Nguồn: thư viện christie-mseries (dòng M) và kết quả tìm kiếm tài liệu Christie; tài liệu
 * riêng của Griffyn CHƯA truy cập được và CHƯA thử trên máy thật.
 *
 *   Lệnh    : "(PWR 1)" đặt (dữ liệu cách mã một dấu cách), "(PWR?)" hỏi — mã 3 chữ, có thể kèm subcode "(FUNC+SUBC ...)"
 *   Phản hồi: `(PWR!000 "Standby Mode")` hoặc `(PWR! 001 "On")` — mã, "!", giá trị số độ dài cố định, mô tả
 *   (Tài liệu tổng hợp do người dùng cung cấp, 2026-09: xác nhận PWR 1/0, SHU 1 = đóng / 0 = mở, cổng 3002.)
 *
 * Các điểm chưa chắc, cố ý tách riêng để sửa một chỗ khi có tài liệu Griffyn:
 *   - POWER_STATE: ý nghĩa các giá trị số ngoài 0/1 → suy từ phần mô tả.
 *   - SHUTTER_CLOSED: (SHU1) = đóng, (SHU0) = mở.
 */
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
    }
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

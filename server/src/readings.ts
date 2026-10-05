import type { CommandTemplates, StatusDto } from '../../shared/api.ts'
import type { Driver, DriverTarget } from './drivers/types.ts'

/** Lấy một số từ phản hồi của máy: nhóm 1 của regex người dùng khai báo, hoặc số cuối cùng nếu bỏ trống. */
export function extractNumber(reply: string, pattern?: string): number | undefined {
  const text = reply.slice(0, 512)
  let raw: string | undefined
  if (pattern?.trim()) {
    try { raw = new RegExp(pattern.trim().slice(0, 120)).exec(text)?.[1] } catch { return undefined }
  } else {
    raw = text.match(/-?\d+(?:\.\d+)?/g)?.at(-1)
  }
  const n = raw === undefined ? NaN : Number(raw)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Bổ sung nhiệt độ / giờ đèn cho trạng thái bằng lệnh hỏi người dùng khai báo (không đoán lệnh của hãng).
 * Lỗi của từng truy vấn chỉ làm mất số liệu đó, không làm hỏng trạng thái nguồn.
 */
export async function addReadings(driver: Driver, target: DriverTarget, status: StatusDto): Promise<StatusDto> {
  const c: CommandTemplates = target.commands ?? {}
  if (c.temperatureQuery?.trim() && status.power !== 'standby') {
    const n = await driver.raw(target, c.temperatureQuery.trim()).then(r => extractNumber(r, c.temperatureRegex), () => undefined)
    if (n !== undefined && n > -40 && n < 200) status.temperatureC = Math.round(n * 10) / 10
  }
  if (c.lampHoursQuery?.trim()) {
    const n = await driver.raw(target, c.lampHoursQuery.trim()).then(r => extractNumber(r, c.lampHoursRegex), () => undefined)
    if (n !== undefined && n >= 0) status.lampHours = Math.round(n)
  }
  return status
}

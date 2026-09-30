// Cấp license MikMaster (chạy trên máy người phát hành, KHÔNG phải máy khách).
//
//   node scripts/license.mjs issue --licensee "Tên khách" [--max 10] [--days 365]
//   node scripts/license.mjs verify <khoá>
//
// Khoá bí mật: ~/.mikmaster-license/private.pem (tạo một lần, KHÔNG đưa vào git, nhớ sao lưu — mất là không cấp được
// khoá mới cho cùng khoá công khai). --max 0 hoặc bỏ trống = không giới hạn số máy; bỏ --days = không hết hạn.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { signLicense, verifyLicense } from '../server/src/license.ts'

const [cmd, ...rest] = process.argv.slice(2)
const flag = name => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined }

if (cmd === 'issue') {
  const licensee = flag('licensee')
  if (!licensee) { console.error('Thiếu --licensee "Tên khách"'); process.exit(1) }
  const max = Number(flag('max') ?? 0)
  const days = flag('days') === undefined ? undefined : Number(flag('days'))
  if (!Number.isInteger(max) || max < 0 || (days !== undefined && !(days > 0))) { console.error('--max phải là số nguyên ≥ 0, --days phải > 0'); process.exit(1) }
  const pem = fs.readFileSync(path.join(os.homedir(), '.mikmaster-license', 'private.pem'), 'utf8')
  const key = signLicense(pem, {
    id: randomBytes(4).toString('hex'), licensee, max,
    ...(days === undefined ? {} : { exp: new Date(Date.now() + days * 86_400_000).toISOString() }),
  })
  console.log(key)
} else if (cmd === 'verify') {
  const p = verifyLicense(rest[0] ?? '')
  console.log(p ? JSON.stringify(p, null, 2) : 'KHÔNG HỢP LỆ')
  process.exit(p ? 0 : 1)
} else {
  console.error('Dùng: node scripts/license.mjs issue --licensee "Tên" [--max N] [--days N] | verify <khoá>')
  process.exit(1)
}

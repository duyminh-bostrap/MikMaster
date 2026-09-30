// Cấp license MikMaster (chạy trên máy người phát hành, KHÔNG phải máy khách).
//
//   node scripts/license.mjs issue --licensee "Tên khách" [--max 10] [--days 365] [--machine XXXX-XXXX-XXXX-XXXX]
//   node scripts/license.mjs rebind <mã gỡ MIKR1.…> --machine <mã máy mới>     (chuyển khoá sang máy khác)
//   node scripts/license.mjs verify <khoá>
//   node scripts/license.mjs revoke <id>                                          (thu hồi một khoá)
//   node scripts/license.mjs status                                               (in file trạng thái đã ký để đăng lên địa chỉ kiểm tra)
//   node scripts/license.mjs ledger                                               (danh sách khoá đã cấp)
//
// --machine gắn khoá với một máy tính (mã máy lấy ở Cài đặt → Bản quyền của máy đó); không có --machine = dùng được mọi máy.
// Sổ cấp phát ~/.mikmaster-license/issued.json ghi mọi khoá đã cấp để `rebind` cấp lại đúng người / số máy / hạn dùng.
//
// Khoá bí mật: ~/.mikmaster-license/private.pem (tạo một lần, KHÔNG đưa vào git, nhớ sao lưu — mất là không cấp được
// khoá mới cho cùng khoá công khai). --max 0 hoặc bỏ trống = không giới hạn số máy; bỏ --days = không hết hạn.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { normalizeMachineCode, parseReleaseCode, signLicense, signStatusDoc, verifyLicense } from '../server/src/license.ts'

const [cmd, ...rest] = process.argv.slice(2)
const flag = name => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined }

const dir = path.join(os.homedir(), '.mikmaster-license')
const ledgerFile = path.join(dir, 'issued.json')
const readLedger = () => { try { return JSON.parse(fs.readFileSync(ledgerFile, 'utf8')) } catch { return {} } }
const writeLedger = l => fs.writeFileSync(ledgerFile, JSON.stringify(l, null, 2), { mode: 0o600 })
const privateKey = () => fs.readFileSync(path.join(dir, 'private.pem'), 'utf8')

function machineFlag() {
  const raw = flag('machine')
  if (raw === undefined) return undefined
  const mc = normalizeMachineCode(raw)
  if (!mc) { console.error('--machine phải là mã máy dạng XXXX-XXXX-XXXX-XXXX (16 ký tự 0-9 A-F)'); process.exit(1) }
  return mc
}

if (cmd === 'issue') {
  const licensee = flag('licensee')
  if (!licensee) { console.error('Thiếu --licensee "Tên khách"'); process.exit(1) }
  const max = Number(flag('max') ?? 0)
  const days = flag('days') === undefined ? undefined : Number(flag('days'))
  if (!Number.isInteger(max) || max < 0 || (days !== undefined && !(days > 0))) { console.error('--max phải là số nguyên ≥ 0, --days phải > 0'); process.exit(1) }
  const mc = machineFlag()
  const id = randomBytes(4).toString('hex')
  const exp = days === undefined ? undefined : new Date(Date.now() + days * 86_400_000).toISOString()
  const key = signLicense(privateKey(), { id, licensee, max, ...(exp ? { exp } : {}), ...(mc ? { mc } : {}) })
  const ledger = readLedger()
  ledger[id] = { licensee, max, exp, machine: mc, issuedAt: new Date().toISOString(), history: [] }
  writeLedger(ledger)
  console.log(key)
} else if (cmd === 'rebind') {
  const receipt = parseReleaseCode(rest[0] ?? '')
  const mc = machineFlag()
  if (!receipt || !mc) { console.error('Dùng: rebind <mã gỡ MIKR1.…> --machine <mã máy mới>'); process.exit(1) }
  const ledger = readLedger()
  const entry = ledger[receipt.id]
  if (!entry) { console.error(`Không thấy khoá ${receipt.id} trong sổ cấp phát (${ledgerFile}).`); process.exit(1) }
  if (entry.machine && entry.machine !== receipt.mc) { console.error(`Mã gỡ này từ máy ${receipt.mc} nhưng khoá đang gắn với ${entry.machine}. Không cấp lại.`); process.exit(1) }
  if (entry.exp && Date.parse(entry.exp) < Date.now()) { console.error(`Khoá ${receipt.id} đã hết hạn ${entry.exp.slice(0, 10)} — cấp khoá mới bằng "issue".`); process.exit(1) }
  const key = signLicense(privateKey(), { id: receipt.id, licensee: entry.licensee, max: entry.max, ...(entry.exp ? { exp: entry.exp } : {}), mc })
  entry.history.push({ machine: entry.machine ?? null, releasedAt: receipt.at, reboundAt: new Date().toISOString() })
  entry.machine = mc
  writeLedger(ledger)
  console.log(key)
} else if (cmd === 'revoke') {
  const ledger = readLedger()
  const id = rest[0]
  if (!id || !ledger[id]) { console.error(`Không thấy khoá "${id ?? ''}" trong sổ cấp phát.`); process.exit(1) }
  ledger[id].revoked = true
  writeLedger(ledger)
  console.error(`Đã đánh dấu thu hồi ${id}. Chạy "status" và đăng file mới lên địa chỉ kiểm tra để có hiệu lực.`)
} else if (cmd === 'status') {
  // File này đăng ở địa chỉ MIKMASTER_LICENSE_URL (hosting tĩnh bất kỳ). App tải về mỗi 6 giờ; mỗi lần tải được = "đã kiểm tra".
  // Nhớ đăng lại file mới (chạy lại lệnh này) ít nhất mỗi vài tuần: file cũ hơn file app đã nhận sẽ bị bỏ qua.
  const revoked = Object.entries(readLedger()).filter(([, e]) => e.revoked).map(([id]) => id)
  process.stdout.write(signStatusDoc(privateKey(), revoked))
} else if (cmd === 'ledger') {
  for (const [id, e] of Object.entries(readLedger())) {
    console.log(`${id}  ${e.licensee}  max=${e.max || 'không giới hạn'}  hạn=${e.exp ? e.exp.slice(0, 10) : 'không'}${e.revoked ? '  [ĐÃ THU HỒI]' : ''}  máy=${e.machine ?? 'mọi máy'}  chuyển=${e.history.length} lần`)
  }
} else if (cmd === 'verify') {
  const p = verifyLicense(rest[0] ?? '')
  console.log(p ? JSON.stringify(p, null, 2) : 'KHÔNG HỢP LỆ')
  process.exit(p ? 0 : 1)
} else {
  console.error('Dùng: node scripts/license.mjs issue|rebind|verify|ledger (xem đầu file)')
  process.exit(1)
}

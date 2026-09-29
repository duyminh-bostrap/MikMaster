import os from 'node:os'
import path from 'node:path'
import { getAsset } from 'node:sea'
import { startGateway } from './main.ts'
import { mapStatic } from './static.ts'

/*
 * Điểm vào của file chạy đóng gói (MikMaster.exe / MikMaster): giao diện web nhúng sẵn trong file,
 * dữ liệu lưu ở thư mục ứng dụng của người dùng để giữ nguyên khi thay bản .exe mới.
 */

function appDataDir(): string {
  if (process.env.MIKMASTER_DATA) return path.resolve(process.env.MIKMASTER_DATA)
  if (process.platform === 'win32') return path.join(process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'), 'MikMaster')
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'MikMaster')
  return path.join(process.env.XDG_DATA_HOME ?? path.join(os.homedir(), '.local', 'share'), 'mikmaster')
}

// Danh sách file giao diện được script build ghi vào asset "manifest.json".
const names = JSON.parse(Buffer.from(getAsset('manifest.json') as ArrayBuffer).toString('utf8')) as string[]
const files = new Map(names.map(name => [name, Buffer.from(getAsset(`web/${name}`) as ArrayBuffer)]))

startGateway({ staticSource: mapStatic(files), dataDir: appDataDir(), openBrowser: !process.argv.includes('--no-open') })

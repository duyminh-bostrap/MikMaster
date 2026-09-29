import path from 'node:path'
import { startGateway } from './main.ts'
import { fsStatic } from './static.ts'

// Chạy từ mã nguồn: giao diện lấy từ dist/ (sau `pnpm build`), dữ liệu ở data/ cạnh mã nguồn.
startGateway({
  staticSource: fsStatic(path.resolve(import.meta.dirname, '../../dist')),
  dataDir: path.resolve(process.env.MIKMASTER_DATA ?? path.join(import.meta.dirname, '../../data')),
  openBrowser: process.argv.includes('--open'),
})

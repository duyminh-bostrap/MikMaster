import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { createServer } from './http.ts'
import { isLoopbackBind } from './security.ts'

const host = process.env.HOST ?? '127.0.0.1'
const port = Number(process.env.PORT ?? 8787)

// Bind ngoài loopback thì bắt buộc có token; không đặt MIKMASTER_TOKEN thì tự sinh và in ra.
let token = process.env.MIKMASTER_TOKEN || undefined
const generated = !isLoopbackBind(host) && !token
if (generated) token = randomBytes(24).toString('base64url')

// Sau `pnpm build`, cùng tiến trình này phục vụ luôn giao diện web (thư mục dist).
const server = createServer({ staticDir: path.resolve(import.meta.dirname, '../../dist'), token })
server.listen(port, host, () => {
  console.log(`MikMaster gateway listening on http://${host}:${port}`)
  if (token) {
    console.log(generated ? `Token (generated): ${token}` : 'Token authentication enabled (MIKMASTER_TOKEN).')
    console.log(`Open: http://${host}:${port}/?token=<token>   (web lưu token vào trình duyệt)`)
  }
})

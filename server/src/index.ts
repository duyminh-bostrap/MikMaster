import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { createServer } from './http.ts'
import { createProjectStore } from './store.ts'
import { isLoopbackBind } from './security.ts'

const host = process.env.HOST ?? '127.0.0.1'
const port = Number(process.env.PORT ?? 8787)
const openBrowser = process.argv.includes('--open')

// Bind ngoài loopback thì bắt buộc có token; không đặt MIKMASTER_TOKEN thì tự sinh và in ra.
let token = process.env.MIKMASTER_TOKEN || undefined
const loopback = isLoopbackBind(host)
const generated = !loopback && !token
if (generated) token = randomBytes(24).toString('base64url')

// Chrome / Edge / Firefox tự trỏ *.localhost về máy này → địa chỉ dễ nhớ, vẫn là "secure context" để cài như app.
const appUrl = loopback ? `http://mikmaster.localhost${port === 80 ? '' : `:${port}`}` : `http://${host}:${port}`

// Sau `pnpm build`, cùng tiến trình này phục vụ luôn giao diện web (thư mục dist).
const dataDir = path.resolve(process.env.MIKMASTER_DATA ?? path.join(import.meta.dirname, '../../data'))
const store = createProjectStore(dataDir)
const server = createServer({ staticDir: path.resolve(import.meta.dirname, '../../dist'), token, store })

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') console.error(`Port ${port} is already in use — MikMaster is probably already running (open ${appUrl}), or set PORT=… to use another port.`)
  else console.error(err.message)
  process.exit(1)
})

server.listen(port, host, () => {
  console.log(`MikMaster is running:  ${appUrl}`)
  if (loopback) console.log(`                  also: http://127.0.0.1:${port}  (Safari)`)
  console.log(`Projects stored in ${dataDir} (passwords encrypted)`)
  if (token) {
    console.log(generated ? `Token (generated): ${token}` : 'Token authentication enabled (MIKMASTER_TOKEN).')
    console.log(`Open: ${appUrl}/?token=<token>   (the browser remembers it)`)
  }
  if (openBrowser) {
    const [cmd, args] = process.platform === 'darwin' ? ['open', [appUrl]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', appUrl]] : ['xdg-open', [appUrl]]
    execFile(cmd, args, () => undefined)
  }
})

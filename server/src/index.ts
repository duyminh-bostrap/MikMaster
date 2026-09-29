import path from 'node:path'
import { createServer } from './http.ts'

const host = process.env.HOST ?? '127.0.0.1'
const port = Number(process.env.PORT ?? 8787)

// Sau `pnpm build`, cùng tiến trình này phục vụ luôn giao diện web (thư mục dist).
const server = createServer({ staticDir: path.resolve(import.meta.dirname, '../../dist') })
server.listen(port, host, () => {
  console.log(`MikMaster gateway listening on http://${host}:${port}`)
  if (host !== '127.0.0.1' && host !== 'localhost') console.warn('WARNING: gateway is reachable from the network and has no authentication.')
})

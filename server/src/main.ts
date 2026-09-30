import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createServer } from './http.ts'
import { isLoopbackBind } from './security.ts'
import type { StaticSource } from './static.ts'
import { createLicenseManager } from './license.ts'
import { createProjectStore } from './store.ts'

/** Khởi động gateway + giao diện; dùng chung cho `pnpm serve` (mã nguồn) và file chạy đóng gói (.exe). */
export function startGateway(opts: { staticSource?: StaticSource; dataDir: string; openBrowser: boolean }): void {
  const host = process.env.HOST ?? '127.0.0.1'
  const port = Number(process.env.PORT ?? 8787)

  // Bind ngoài loopback thì bắt buộc có token; không đặt MIKMASTER_TOKEN thì tự sinh và in ra.
  let token = process.env.MIKMASTER_TOKEN || undefined
  const loopback = isLoopbackBind(host)
  const generated = !loopback && !token
  if (generated) token = randomBytes(24).toString('base64url')

  // Chrome / Edge / Firefox tự trỏ *.localhost về máy này → địa chỉ dễ nhớ, vẫn là "secure context" để cài như app.
  const appUrl = loopback ? `http://mikmaster.localhost${port === 80 ? '' : `:${port}`}` : `http://${host}:${port}`

  const store = createProjectStore(opts.dataDir)
  const license = createLicenseManager(opts.dataDir)
  const server = createServer({
    staticSource: opts.staticSource, token, store, license,
    onQuit: () => {
      console.log('Stopped from the web app.')
      server.close()
      server.closeAllConnections()
      process.exit(0)
    },
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use — MikMaster is probably already running (open ${appUrl}), or set PORT=… to use another port.`)
      if (opts.openBrowser) openUrl(appUrl) // bấm đúp lần hai: mở cửa sổ của bản đang chạy
    } else {
      console.error(err.message)
    }
    process.exitCode = 1
  })

  server.listen(port, host, () => {
    console.log(`MikMaster is running:  ${appUrl}`)
    if (loopback) console.log(`                  also: http://127.0.0.1:${port}  (Safari)`)
    console.log(`Projects stored in ${opts.dataDir} (passwords encrypted)`)
    const lic = license.status()
    console.log(`License: ${lic.state === 'licensed' ? `licensed to ${lic.licensee}` : lic.state === 'trial' ? `trial, ${lic.trialDaysLeft} day(s) left` : `${lic.state} — limited to ${lic.freeLimit} projectors, no control`}`)
    if (token) {
      console.log(generated ? `Token (generated): ${token}` : 'Token authentication enabled (MIKMASTER_TOKEN).')
      console.log(`Open: ${appUrl}/?token=<token>   (the browser remembers it)`)
    }
    // Chỉ khi có cửa sổ console (Windows .exe, terminal); app macOS chạy nền → tắt bằng menu Quit.
    if (process.stdout.isTTY) console.log('Keep this window open while you use MikMaster. Press Ctrl+C (or Quit in the app menu) to stop.')
    if (opts.openBrowser) openUrl(appUrl)
    // Kiểm tra bản quyền qua mạng khi khởi động và mỗi 6 giờ (chỉ khi có địa chỉ kiểm tra); lỗi mạng chỉ bỏ qua lần đó.
    void license.checkNow()
    setInterval(() => void license.checkNow(), 6 * 3_600_000).unref()
  })
}

function openUrl(url: string): void {
  const [cmd, args] = process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
    : ['xdg-open', [url]]
  execFile(cmd, args, () => undefined)
}

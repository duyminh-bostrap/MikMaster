import fs from 'node:fs'
import path from 'node:path'

/** Nguồn file giao diện web: thư mục `dist/` khi chạy từ mã nguồn, hoặc tài nguyên nhúng trong file .exe. */
export type StaticSource = (pathname: string) => { body: Buffer; type: string } | null

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon',
}
const typeOf = (file: string) => MIME[path.extname(file)] ?? 'application/octet-stream'

/** Đường dẫn lạ (route của app) → index.html, để tải lại trang ở giữa app vẫn chạy. */
function withFallback(get: (rel: string) => Buffer | null): StaticSource {
  return pathname => {
    let rel: string
    try { rel = decodeURIComponent(pathname).replace(/^\/+/, '') } catch { rel = '' }
    const body = (rel && get(rel)) || null
    if (body) return { body, type: typeOf(rel) }
    const index = get('index.html')
    return index ? { body: index, type: typeOf('index.html') } : null
  }
}

export function fsStatic(dir: string): StaticSource | undefined {
  if (!fs.existsSync(dir)) return undefined
  const root = path.resolve(dir)
  return withFallback(rel => {
    const file = path.normalize(path.join(root, rel))
    if (!file.startsWith(root + path.sep) && file !== root) return null // chặn ../
    try { return fs.statSync(file).isFile() ? fs.readFileSync(file) : null } catch { return null }
  })
}

export function mapStatic(files: Map<string, Buffer>): StaticSource {
  return withFallback(rel => files.get(rel) ?? null)
}

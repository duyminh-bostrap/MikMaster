import type { PreviewDto } from '../../../shared/api.ts'
import { digestGet } from '../net/digest.ts'
import { DeviceError } from '../net/tcp.ts'
import type { DriverTarget } from './types.ts'

/*
 * Remote Preview của Panasonic (PT-RQ35K…) qua trang web của máy (cổng 80, xác thực Digest, realm "WEB Zone").
 * Đã biết từ giao diện web (DevTools, 2026-09-30) và sách hướng dẫn (Web control → [Status] → [Remote preview], tr. 257):
 *   /cgi-bin/main.cgi?page=MENU_PREVIEW → khung /cgi-bin/preview_status.cgi → iframe /cgi-bin/preview.cgi?lang=e
 *   preview.cgi chứa <img src="blob:…"> do JavaScript của trang tạo ra từ dữ liệu ảnh tải về (địa chỉ ảnh nằm trong script).
 * CHƯA BIẾT (chưa đọc được script vì cần đăng nhập): địa chỉ và định dạng chính xác của yêu cầu lấy ảnh. Vì vậy driver này
 * ĐỌC preview.cgi, DÒ trong script các địa chỉ có dạng ảnh, thử lần lượt (chỉ GET), nhận ảnh nếu là JPEG / PNG / GIF (trực tiếp hoặc base64),
 * rồi nhớ địa chỉ tìm được. Nếu dò không ra, gateway ghi các ứng viên ra terminal ([preview <ip>] …) để sửa cho đúng.
 */
const PREVIEW_PAGE = '/cgi-bin/preview.cgi?lang=e'
const MAX_CANDIDATES = 4

const discovered = new Map<string, string>()

/** Ứng viên địa chỉ ảnh trong HTML / JavaScript của preview.cgi (theo thứ tự khả năng đúng). */
export function findImageCandidates(html: string): string[] {
  const out: string[] = []
  const add = (u: string | undefined) => {
    if (!u) return
    const clean = u.trim().replace(/[?&]$/, '')
    if (!/^\/?[\w./-]+(?:\?[\w=&%.-]*)?$/.test(clean) || /^(?:https?:)?\/\//.test(clean)) return // chỉ đường dẫn trên chính máy, không nhảy sang host khác
    if (/\.(?:css|js|htm|html|svg|ico)(?:\?|$)/i.test(clean)) return
    if (/preview\.cgi|preview_status\.cgi|simple_status\.cgi|titleframe|leftframe|rightframe|topframe/i.test(clean)) return
    const path = clean.startsWith('/') ? clean : `/cgi-bin/${clean}`
    if (!out.includes(path)) out.push(path)
  }
  for (const m of html.matchAll(/\.open\(\s*['"]GET['"]\s*,\s*['"]([^'"]+)['"]/gi)) add(m[1])
  for (const m of html.matchAll(/\bfetch\(\s*['"]([^'"]+)['"]/gi)) add(m[1])
  for (const m of html.matchAll(/\.(?:src|href)\s*=\s*['"]([^'"]+)['"]/gi)) add(m[1])
  for (const m of html.matchAll(/['"](\/?cgi-bin\/[\w./-]+(?:\?[\w=&%.-]*)?)['"]/gi)) add(m[1])
  for (const m of html.matchAll(/['"]([\w./-]*(?:preview|capture|image|screen)[\w./-]*\.(?:cgi|jpe?g|png|bmp))(?:\?[^'"]*)?['"]/gi)) add(m[1])
  // Ưu tiên địa chỉ có chữ gợi ý là ảnh.
  const score = (u: string) => (/preview|image|capture|screen|snap|thumb/i.test(u) ? 0 : 1) + (/\.(?:jpe?g|png)/i.test(u) ? 0 : 0.5)
  return out.sort((a, b) => score(a) - score(b)).slice(0, MAX_CANDIDATES)
}

/** Nhận diện ảnh: JPEG / PNG / GIF trực tiếp, hoặc chuỗi base64 (có thể kèm tiền tố data:). Trả về `data:` URL. */
export function toDataUrl(body: Buffer, contentType: string): string | null {
  const magic = (b: Buffer): string | null =>
    b[0] === 0xff && b[1] === 0xd8 ? 'image/jpeg' : b.subarray(1, 4).toString('latin1') === 'PNG' && b[0] === 0x89 ? 'image/png' : b.subarray(0, 3).toString('latin1') === 'GIF' ? 'image/gif' : null
  const direct = magic(body)
  if (direct) return `data:${direct};base64,${body.toString('base64')}`
  if (/^image\//i.test(contentType) && body.length > 0) return `data:${contentType.split(';')[0]};base64,${body.toString('base64')}`
  const text = body.toString('latin1').trim()
  const m = /^(?:data:image\/[a-z]+;base64,)?([A-Za-z0-9+/=\r\n]{40,})$/.exec(text)
  if (m) {
    const decoded = Buffer.from(m[1]!.replace(/\s+/g, ''), 'base64')
    const type = magic(decoded)
    if (type) return `data:${type};base64,${decoded.toString('base64')}`
  }
  return null
}

const logged = new Set<string>()
const logOnce = (host: string, line: string) => { const k = `${host}|${line}`; if (!logged.has(k)) { logged.add(k); console.log(`[preview ${host}] ${line}`) } }

export async function panasonicPreview(t: DriverTarget, port = 80): Promise<PreviewDto> {
  if (!t.username && !t.password) throw new DeviceError('auth', 'Enter the projector web account (admin) to see the live preview')
  const get = (uri: string) => digestGet({ host: t.host, port, uri, username: t.username ?? '', password: t.password ?? '', timeoutMs: t.timeoutMs })
  const key = `${t.host}:${port}`

  const tryImage = async (uri: string): Promise<PreviewDto | null> => {
    const r = await get(uri)
    if (r.status !== 200) return null
    const image = toDataUrl(r.body, String(r.headers['content-type'] ?? ''))
    return image ? { state: 'image', image } : null
  }

  const known = discovered.get(key)
  if (known) {
    const hit = await tryImage(known).catch(err => { if (err instanceof DeviceError && err.code === 'auth') throw err; return null })
    if (hit) return hit
    discovered.delete(key) // địa chỉ cũ không còn dùng được → dò lại
  }

  const page = await get(PREVIEW_PAGE)
  if (page.status === 404) throw new DeviceError('unsupported', 'This projector has no Remote preview page')
  if (page.status !== 200) throw new DeviceError('protocol', `Projector web answered HTTP ${page.status} for the preview page`)
  const candidates = findImageCandidates(page.body.toString('utf8'))
  for (const uri of candidates) {
    const hit = await tryImage(uri).catch(err => { if (err instanceof DeviceError && err.code === 'auth') throw err; return null })
    if (hit) { discovered.set(key, uri); logOnce(t.host, `found the preview image at ${uri}`); return hit }
  }
  logOnce(t.host, `could not find the preview image; candidates tried: ${candidates.join(', ') || '(none)'} — send the source of ${PREVIEW_PAGE} to fix this`)
  throw new DeviceError('protocol', 'Could not find the preview image in the projector web page (see the gateway terminal for details)')
}

/** Chỉ để test. */
export function resetPanasonicPreview(): void { discovered.clear(); logged.clear() }

import type { PreviewDto } from '../../../shared/api.ts'
import { DeviceError } from '../net/tcp.ts'
import type { DriverTarget } from './types.ts'

/*
 * Remote Preview của Panasonic (PT-RQ35K…). Đọc từ mã nguồn trang /cgi-bin/preview.cgi của máy thật (2026-09-30) và ĐÃ KIỂM trên
 * PT-RQ35K (192.168.1.176, firmware 1.21): trang KHÔNG tải ảnh bằng HTTP mà mở WebSocket
 *
 *     ws://<ip>:8080     giao thức con "pj-cast-protocol"     KHÔNG cần đăng nhập
 *
 *   máy → khách : khung NHỊ PHÂN = một ảnh JPEG (480×304, ~5 khung/giây, ~50 KB)
 *                 chuỗi 'BLANK' (không có ảnh) · 'HDCP' (nội dung có HDCP, không xem trước được) · 'SIGNAL' / 'REFRESH' (đổi tín hiệu)
 *                 · 'CHANGING_PRE' (đang đổi Pre-Show)
 *   khách → máy : 'start' khi mở kết nối (bắt đầu gửi ảnh); 'preshow:1' / 'preshow:0' bật / tắt Pre-Show — driver KHÔNG gửi (đó là đổi cài đặt máy).
 *
 * Mỗi máy giữ MỘT kết nối dùng chung cho mọi lời gọi (trang máy + nhiều thẻ Dashboard), giữ khung mới nhất, tự đóng sau IDLE_MS không ai hỏi.
 */
const WS_PORT = 8080
const PROTOCOL = 'pj-cast-protocol'
const OPEN_TIMEOUT_MS = 3000
const FRAME_TIMEOUT_MS = 4000
/** Khung mới hơn ngần này được coi là "mới", trả luôn không chờ khung kế tiếp. */
const FRESH_MS = 1500
const IDLE_MS = 20_000

interface Frame { data: Buffer; at: number }
interface Stream {
  ws: WebSocket
  frame?: Frame
  /** trạng thái do máy báo bằng chuỗi (xoá khi có ảnh mới) */
  status?: 'blank' | 'hdcp'
  waiters: Array<() => void>
  idle?: ReturnType<typeof setTimeout>
  dead: boolean
}

const streams = new Map<string, Stream>()
/** Kết nối đang mở dở: nhiều lời gọi cùng lúc chờ chung một kết nối thay vì mỗi cái mở một. */
const opening = new Map<string, Promise<Stream>>()

const isJpeg = (b: Buffer) => b.length > 4 && b[0] === 0xff && b[1] === 0xd8

function close(key: string, s: Stream): void {
  s.dead = true
  clearTimeout(s.idle)
  if (streams.get(key) === s) streams.delete(key)
  try { s.ws.close() } catch { /* đã đóng */ }
  for (const w of s.waiters.splice(0)) w()
}

function open(key: string, host: string, port: number): Promise<Stream> {
  return new Promise((resolve, reject) => {
    let ws: WebSocket
    try { ws = new WebSocket(`ws://${host}:${port}`, PROTOCOL) } catch (err) { return reject(new DeviceError('connect', `Cannot open the preview stream (${err instanceof Error ? err.message : 'error'})`)) }
    ws.binaryType = 'arraybuffer'
    const s: Stream = { ws, waiters: [], dead: false }
    const timer = setTimeout(() => { close(key, s); reject(new DeviceError('timeout', `${host}:${port} did not open the preview stream within ${OPEN_TIMEOUT_MS}ms`)) }, OPEN_TIMEOUT_MS)
    ws.addEventListener('open', () => { clearTimeout(timer); ws.send('start'); streams.set(key, s); resolve(s) })
    ws.addEventListener('message', e => {
      if (typeof e.data === 'string') {
        if (e.data === 'BLANK') { s.status = 'blank'; s.frame = undefined }
        else if (e.data === 'HDCP') { s.status = 'hdcp'; s.frame = undefined }
        else return
      } else {
        const b = Buffer.from(e.data as ArrayBuffer)
        if (!isJpeg(b)) return
        s.frame = { data: b, at: Date.now() }
        s.status = undefined
      }
      for (const w of s.waiters.splice(0)) w()
    })
    ws.addEventListener('error', () => { clearTimeout(timer); if (!streams.has(key)) reject(new DeviceError('connect', `Cannot reach the preview stream at ${host}:${port}`)); close(key, s) })
    ws.addEventListener('close', () => { clearTimeout(timer); close(key, s) })
  })
}

const toResult = (s: Stream): PreviewDto | null =>
  s.frame ? { state: 'image', image: `data:image/jpeg;base64,${s.frame.data.toString('base64')}`, resolution: '480x304' }
  : s.status === 'blank' ? { state: 'no-signal' }
  : s.status === 'hdcp' ? { state: 'no-thumbnail' }
  : null

/** Ảnh xem trước hiện tại của máy Panasonic. Không cần tài khoản (cổng 8080 của máy không đòi đăng nhập). */
export async function panasonicPreview(t: DriverTarget, port = WS_PORT): Promise<PreviewDto> {
  const key = `${t.host}:${port}`
  let s = streams.get(key)
  if (!s) {
    let p = opening.get(key)
    if (!p) { p = open(key, t.host, port).finally(() => opening.delete(key)); opening.set(key, p) }
    s = await p
  }
  clearTimeout(s.idle)
  s.idle = setTimeout(() => close(key, s), IDLE_MS)

  if (s.frame && Date.now() - s.frame.at < FRESH_MS) return toResult(s)!
  // Chờ khung / trạng thái kế tiếp.
  await new Promise<void>(resolve => { const timer = setTimeout(resolve, FRAME_TIMEOUT_MS); s.waiters.push(() => { clearTimeout(timer); resolve() }) })
  const r = toResult(s)
  if (r) return r
  if (s.dead) throw new DeviceError('connect', 'The preview stream closed')
  throw new DeviceError('timeout', 'The projector sent no preview image (is it in standby? Pre-Show mode shows the picture without projecting)')
}

/** Chỉ để test. */
export function closeAllPanasonicStreams(): void { for (const [k, s] of [...streams]) close(k, s) }

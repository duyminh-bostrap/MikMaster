import type { PreviewDto } from '../../../shared/api.ts'
import { digestGet } from '../net/digest.ts'
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
 *   khách → máy : 'start' khi mở kết nối (bắt đầu gửi ảnh); 'preshow:1' / 'preshow:0' bật / tắt Pre-Show (xem ảnh cả khi máy đang tắt).
 *                 Pre-Show là CÀI ĐẶT của máy nên driver chỉ gửi khi người dùng yêu cầu rõ (`opts.preshow`): 'preshow:1' đúng một lần mỗi kết nối,
 *                 và tự gửi lại 'preshow:0' khi đóng kết nối (hết người xem) để trả máy về như cũ.
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
  /** Driver đã bật Pre-Show trên máy qua kết nối này (cần trả lại khi đóng). */
  preshow?: boolean
  /** Máy đang đổi Pre-Show ('CHANGING_PRE'): chờ ảnh. */
  switching?: boolean
  /** Đã xem trạng thái ban đầu để quyết định có cần bật Pre-Show không. */
  preshowChecked?: boolean
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
  // Trả Pre-Show về như cũ nếu chính driver đã bật.
  if (s.preshow) { try { s.ws.send('preshow:0') } catch { /* kết nối đã đóng */ } s.preshow = false }
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
        else if (e.data === 'CHANGING_PRE') { s.switching = true; s.status = undefined; s.frame = undefined }
        else return
      } else {
        const b = Buffer.from(e.data as ArrayBuffer)
        if (!isJpeg(b)) return
        s.frame = { data: b, at: Date.now() }
        s.status = undefined
        s.switching = false
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
  : s.status === 'hdcp' ? { state: 'hdcp' }
  : null

/**
 * Ảnh xem trước hiện tại của máy Panasonic. Không cần tài khoản (cổng 8080 của máy không đòi đăng nhập).
 * `opts.preshow`: true = bật Pre-Show (xem ảnh cả khi máy tắt; gửi 'preshow:1' một lần); false = tắt lại nếu driver đã bật; bỏ trống = không đụng cài đặt máy.
 */
export async function panasonicPreview(t: DriverTarget, port = WS_PORT, opts: { preshow?: boolean } = {}): Promise<PreviewDto> {
  const key = `${t.host}:${port}`
  let s = streams.get(key)
  if (!s) {
    let p = opening.get(key)
    if (!p) { p = open(key, t.host, port).finally(() => opening.delete(key)); opening.set(key, p) }
    s = await p
  }
  clearTimeout(s.idle)
  s.idle = setTimeout(() => close(key, s), IDLE_MS)

  if (opts.preshow === true && !s.preshow && !s.preshowChecked) {
    // Máy .176 đo thực tế (2026-10-01): đang chờ mà VẪN gửi ảnh ngay khi Pre-Show đã bật sẵn → chỉ bật khi máy chưa gửi ảnh (BLANK / im lặng),
    // và chỉ "trả lại" (preshow:0) khi chính driver đã bật — không tắt cài đặt có sẵn của người dùng.
    if (!s.frame && !s.status) await new Promise<void>(resolve => { const timer = setTimeout(resolve, 1500); s.waiters.push(() => { clearTimeout(timer); resolve() }) })
    s.preshowChecked = true
    if (!s.frame && s.status !== 'hdcp') { s.preshow = true; s.switching = true; s.ws.send('preshow:1') }
  }
  else if (opts.preshow === false && s.preshow) { s.preshow = false; s.ws.send('preshow:0'); return { state: 'no-signal' } }

  if (s.frame && Date.now() - s.frame.at < FRESH_MS) return toResult(s)!
  // Chờ khung / trạng thái kế tiếp.
  await new Promise<void>(resolve => { const timer = setTimeout(resolve, FRAME_TIMEOUT_MS); s.waiters.push(() => { clearTimeout(timer); resolve() }) })
  const r = toResult(s)
  if (r) return r
  if (s.dead) throw new DeviceError('connect', 'The preview stream closed')
  if (s.switching) throw new DeviceError('timeout', 'Pre-Show mode is starting — the picture appears in a few seconds')
  throw new DeviceError('timeout', 'The projector sent no preview image (is it in standby? Turn on Pre-Show mode to see the picture without projecting)')
}

/** Chỉ để test. */
export function closeAllPanasonicStreams(): void { for (const [k, s] of [...streams]) close(k, s) }

/*
 * Nhiệt độ từ trang web của máy: /cgi-bin/simple_status.cgi (trang này là khung "trạng thái" nằm dưới ảnh trong Remote preview;
 * cấu trúc đọc từ DevTools của một PT-RQ35K thật, 2026-09-30):
 *   <div class="contents_name">INTAKE AIR</div> … <span class="temp_string_good">27°C</span><span class="temp_string_good">80°F</span>
 * Cần tài khoản web của máy (Digest, realm "WEB Zone"), khác cổng WebSocket của ảnh.
 */
const STATUS_URI = '/cgi-bin/simple_status.cgi?lang=e'

const titleCase = (s: string) => s.trim().toLowerCase().replace(/^\w/, c => c.toUpperCase())

/** Các nhiệt độ °C trong trang simple_status (tên nhãn phía trước, mặc định "Intake air"); bỏ số °F. */
export function parseSimpleStatus(html: string): { name: string; c: number }[] {
  const out: { name: string; c: number }[] = []
  const names = [...html.matchAll(/class="contents_name"[^>]*>([\s\S]*?)<\/div>/gi)].map(m => ({ at: m.index ?? 0, text: m[1]!.replace(/<[^>]*>|&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() }))
  for (const m of html.matchAll(/<span[^>]*class="temp_string_\w+"[^>]*>\s*(-?\d{1,3})\s*(?:&deg;|&#176;|°|º)\s*C\s*<\/span>/gi)) {
    const c = Number(m[1])
    if (c < -20 || c > 150) continue
    const label = [...names].reverse().find(n => n.at < (m.index ?? 0))?.text
    out.push({ name: label ? titleCase(label) : 'Intake air', c })
  }
  return out
}

/** Đọc nhiệt độ từ web của máy; ném DeviceError('auth') nếu tài khoản bị từ chối (digest tự chặn thử lại 5 phút). */
export async function panasonicWebTemperatures(t: DriverTarget, port = 80): Promise<{ name: string; c: number }[]> {
  if (!t.username && !t.password) throw new DeviceError('auth', 'The projector web needs an account')
  const r = await digestGet({ host: t.host, port, uri: STATUS_URI, username: t.username ?? '', password: t.password ?? '', timeoutMs: t.timeoutMs })
  if (r.status !== 200) throw new DeviceError('protocol', `The projector web answered ${r.status}`)
  return parseSimpleStatus(r.body.toString('utf8'))
}

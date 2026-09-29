import { execFile } from 'node:child_process'
import net from 'node:net'
import type { PingDto, PingResultDto } from '../../shared/api.ts'

/*
 * "Ping" một máy chiếu = hai phép thử độc lập, chạy song song:
 *   - ICMP: máy có mặt trên mạng không (dùng lệnh `ping` của hệ điều hành; không cần quyền root).
 *   - TCP : cổng điều khiển có mở không (máy có thể trả lời ICMP nhưng dịch vụ điều khiển đang tắt,
 *           hoặc chặn ICMP nhưng cổng vẫn mở).
 * IP đã được kiểm tra là IPv4 nội bộ trước khi tới đây, và truyền cho `ping` như một đối số (không qua shell).
 */

const TIMEOUT_MS = 2000

function pingArgs(ip: string): string[] {
  if (process.platform === 'win32') return ['-n', '1', '-w', String(TIMEOUT_MS), ip]
  if (process.platform === 'darwin') return ['-c', '1', '-t', String(TIMEOUT_MS / 1000), ip]
  return ['-c', '1', '-W', String(TIMEOUT_MS / 1000), ip]
}

// Tìm `ping` qua PATH trước; bản đóng gói có thể được mở với PATH tối giản (macOS để ping ở /sbin).
const PING_CANDIDATES = process.platform === 'win32' ? ['ping'] : ['ping', '/sbin/ping', '/bin/ping', '/usr/bin/ping', '/usr/sbin/ping']

/** `null` nếu máy chạy gateway không có lệnh `ping`. */
export async function icmpPing(ip: string): Promise<PingResultDto | null> {
  for (const bin of PING_CANDIDATES) {
    const r = await runPing(bin, ip)
    if (r !== 'missing') return r
  }
  return null
}

function runPing(bin: string, ip: string): Promise<PingResultDto | 'missing'> {
  return new Promise(resolve => {
    const started = Date.now()
    execFile(bin, pingArgs(ip), { timeout: TIMEOUT_MS + 1500 }, (err, stdout) => {
      if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') return resolve('missing')
      // Windows: "Destination host unreachable" vẫn trả mã thoát 0 → chỉ tin khi có dòng trả lời (có TTL=).
      if (process.platform === 'win32' && !/TTL=/i.test(stdout)) return resolve({ ok: false, error: 'No reply' })
      const time = /time[=<]\s*([\d.]+)\s*ms/i.exec(stdout)
      if (!err && time) return resolve({ ok: true, ms: Math.max(0, Math.round(Number(time[1]) * 10) / 10) })
      if (!err) return resolve({ ok: true, ms: Date.now() - started })
      resolve({ ok: false, error: 'No reply' })
    })
  })
}

export function tcpProbe(ip: string, port: number): Promise<PingResultDto> {
  return new Promise(resolve => {
    const started = Date.now()
    const socket = net.createConnection({ host: ip, port })
    const done = (r: PingResultDto) => { clearTimeout(timer); socket.destroy(); resolve(r) }
    const timer = setTimeout(() => done({ ok: false, error: 'No answer (filtered or offline)' }), TIMEOUT_MS)
    socket.once('connect', () => done({ ok: true, ms: Date.now() - started }))
    socket.once('error', (err: NodeJS.ErrnoException) =>
      done({ ok: false, error: err.code === 'ECONNREFUSED' ? 'Port closed (connection refused)' : err.code === 'EHOSTUNREACH' ? 'Host unreachable' : err.message }))
  })
}

export async function pingDevice(ip: string, port: number, udp: boolean): Promise<PingDto> {
  const [icmp, tcp] = await Promise.all([icmpPing(ip), udp ? Promise.resolve(null) : tcpProbe(ip, port)])
  return { icmp, tcp, port, at: new Date().toISOString() }
}

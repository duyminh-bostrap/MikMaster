import { defaultProtocolConfig } from '@/constants/protocols'
import type { LogEntry, PowerState, Projector, ProtocolType } from '@/types'
import type { Tone } from '@/utils/tones'

export const DEFAULT_BRIGHTNESS = 85

/** Trạng thái hiển thị của ô preview; thứ tự ưu tiên phản ánh hành vi thật của máy chiếu. */
export type PreviewState = 'nolink' | 'off' | 'standby' | 'warmup' | 'cooling' | 'shutter' | 'pattern' | 'live'

export function getPreviewState(p: Projector): PreviewState {
  // Mất liên lạc: không biết máy đang chiếu gì → không vẽ trạng thái cũ như thể còn đúng.
  if (p.connection !== 'connected') return 'nolink'
  if (p.power === 'off') return 'off'
  if (p.power === 'standby') return 'standby'
  if (p.power === 'warmup') return 'warmup'
  if (p.power === 'cooling') return 'cooling'
  if (p.shutter) return 'shutter'
  if (p.testPattern.enabled) return 'pattern'
  return 'live'
}

/** Đặt trạng thái cuối ngay (mô phỏng, hoặc máy không có lệnh bật / tắt thật). */
/** Chữ và màu hiển thị của trạng thái nguồn: bật = xanh, khởi động = vàng, làm nguội = xanh dương, tắt / chờ = xám. */
export function powerDisplay(power: PowerState): { label: string; tone: Tone } {
  switch (power) {
    case 'on': return { label: 'ON', tone: 'ok' }
    case 'warmup': return { label: 'WARMING UP', tone: 'warn' }
    case 'cooling': return { label: 'COOLING DOWN', tone: 'accent' }
    default: return { label: 'OFF', tone: 'off' }
  }
}

export function applyPower(p: Projector, power: PowerState): Projector {
  const { powerPending: _drop, ...rest } = p
  return { ...rest, power, telemetry: { ...p.telemetry, brightness: power === 'on' ? DEFAULT_BRIGHTNESS : 0 } }
}

/**
 * Lệnh bật / tắt ĐÃ GỬI THÀNH CÔNG tới máy thật: hiện giai đoạn chuyển tiếp (bật → khởi động, tắt → làm nguội) và CHỜ máy xác nhận
 * (vòng đọc trạng thái). Máy đã ở trạng thái đích thì không đổi gì.
 */
export function applyPowerPending(p: Projector, to: 'on' | 'standby', now: number): Projector {
  if (to === 'on' && (p.power === 'on' || p.power === 'warmup')) return p
  if (to === 'standby' && (p.power === 'standby' || p.power === 'off' || p.power === 'cooling')) return p
  return { ...p, power: to === 'on' ? 'warmup' : 'cooling', powerPending: { to, from: p.power, at: now }, telemetry: { ...p.telemetry, brightness: 0 } }
}

export function createProjector(input: {
  id: string
  boothId: string
  name: string
  ip: string
  model?: string
  protocol?: ProtocolType
}): Projector {
  return {
    id: input.id,
    boothId: input.boothId,
    name: input.name,
    model: input.model ?? 'Unknown',
    network: { ip: input.ip, protocol: defaultProtocolConfig(input.protocol ?? 'pjlink-class2') },
    power: 'standby',
    shutter: false,
    input: 'HDMI 1',
    testPattern: { enabled: false, type: 'grid' },
    telemetry: { temperatureC: 0, lampHours: 0, brightness: 0 },
    errors: [],
    connection: 'connected',
    log: [],
    lens: {
      position: { shiftX: 0, shiftY: 0, zoom: 75, focus: 70 },
      presets: [null, null, null, null],
      activePreset: null,
    },
  }
}

export function makeLogEntry(level: LogEntry['level'], message: string): LogEntry {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), level, message }
}

/** Số dòng log giữ lại cho mỗi máy (cũng là phạm vi của file log xuất ra). */
export const LOG_LIMIT = 200

/** Log mới nhất ở đầu, giữ tối đa LOG_LIMIT dòng. */
export function appendLog(p: Projector, level: LogEntry['level'], message: string): LogEntry[] {
  return [makeLogEntry(level, message), ...p.log].slice(0, LOG_LIMIT)
}

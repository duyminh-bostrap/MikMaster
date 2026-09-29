import { defaultProtocolConfig } from '@/constants/protocols'
import type { LogEntry, PowerState, Projector, ProtocolType } from '@/types'

export const DEFAULT_BRIGHTNESS = 85

/** Trạng thái hiển thị của ô preview; thứ tự ưu tiên phản ánh hành vi thật của máy chiếu. */
export type PreviewState = 'nolink' | 'off' | 'standby' | 'shutter' | 'pattern' | 'live'

export function getPreviewState(p: Projector): PreviewState {
  // Mất liên lạc: không biết máy đang chiếu gì → không vẽ trạng thái cũ như thể còn đúng.
  if (p.connection !== 'connected') return 'nolink'
  if (p.power === 'off') return 'off'
  if (p.power === 'standby') return 'standby'
  if (p.shutter) return 'shutter'
  if (p.testPattern.enabled) return 'pattern'
  return 'live'
}

export function applyPower(p: Projector, power: PowerState): Projector {
  return { ...p, power, telemetry: { ...p.telemetry, brightness: power === 'on' ? DEFAULT_BRIGHTNESS : 0 } }
}

export function createProjector(input: {
  id: string
  boothId: string
  name: string
  ip: string
  location?: string
  model?: string
  protocol?: ProtocolType
}): Projector {
  return {
    id: input.id,
    boothId: input.boothId,
    name: input.name,
    location: input.location ?? 'Unassigned',
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

/** Log mới nhất ở đầu, giữ tối đa 50 dòng. */
export function appendLog(p: Projector, level: LogEntry['level'], message: string): LogEntry[] {
  return [makeLogEntry(level, message), ...p.log].slice(0, 50)
}

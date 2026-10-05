import type { StatusDto } from '../../shared/api.ts'
import { INPUT_SOURCES } from '@/constants/inputs'
import { TEST_PATTERNS } from '@/constants/testPatterns'
import { DEFAULT_BRIGHTNESS, appendLog } from '@/utils/projector'
import type { ConnectionStatus, InputSource, PowerState, Projector, TestPatternType } from '@/types'

export type SyncResult = { ok: true; status: StatusDto } | { ok: false; code: string; message: string }

const LINK_DOWN = new Set(['connect', 'timeout', 'network'])
const LINK_REJECTED = new Set(['protocol', 'unsupported'])

const FAILURE_LABEL: Record<ConnectionStatus, string | null> = { connected: null, disconnected: 'Offline', 'protocol-error': 'Protocol error', 'auth-failed': 'Login required' }
const OWN_LABELS = new Set(['Offline', 'Protocol error', 'Login required'])

function isTestPattern(v: string | undefined): v is TestPatternType {
  return !!v && TEST_PATTERNS.some(x => x.type === v)
}

function isInputSource(label: string | undefined): label is InputSource {
  return !!label && (INPUT_SOURCES as readonly string[]).includes(label)
}

/** Áp kết quả đọc/ghi từ thiết bị thật vào model; hàm thuần để reducer gọi. */
/** Chờ máy phản ứng với lệnh bật / tắt tối đa chừng này trước khi coi là không có hiệu lực. */
export const PENDING_GRACE_MS = 20_000

export function applyRemote(p: Projector, r: SyncResult, now: number = Date.now()): Projector {
  if (!r.ok) {
    const connection: ConnectionStatus = LINK_DOWN.has(r.code) ? 'disconnected' : r.code === 'auth' ? 'auth-failed' : LINK_REJECTED.has(r.code) ? 'protocol-error' : p.connection
    const label = FAILURE_LABEL[connection]
    const errors = label ? [label, ...p.errors.filter(e => !OWN_LABELS.has(e))] : p.errors
    const repeated = connection === p.connection && p.log[0]?.message === r.message
    return { ...p, connection, errors, log: repeated ? p.log : appendLog(p, 'error', r.message) }
  }

  const s = r.status
  let log = p.log
  if (p.connection !== 'connected') log = appendLog({ ...p, log }, 'info', 'Connection restored')
  for (const e of s.errors) if (!p.errors.includes(e)) log = appendLog({ ...p, log }, 'error', e)

  // Máy báo: on / warmup (đang khởi động) / cooling (đang làm nguội) / standby. PJLink/Panasonic/Christie không có trạng thái "off" riêng:
  // máy tắt báo "standby"; giữ "off" nếu người vận hành vừa tắt để nút OFF không tự nhảy về STBY.
  const reported: PowerState | undefined = s.power === undefined ? undefined : s.power === 'standby' ? (p.power === 'off' ? 'off' : 'standby') : s.power
  let power: PowerState = reported ?? p.power
  let powerPending = p.powerPending
  if (powerPending && reported !== undefined) {
    const reached = powerPending.to === 'on' ? (reported === 'on' || reported === 'warmup') : (reported === 'standby' || reported === 'off' || reported === 'cooling')
    if (reached) powerPending = undefined // máy đã xác nhận (đang chuyển hoặc đã tới đích): theo trạng thái máy báo
    else if (now - powerPending.at < PENDING_GRACE_MS) power = p.power // máy chưa kịp phản ứng với lệnh: giữ giai đoạn chuyển tiếp
    else {
      // Quá hạn mà máy vẫn ở trạng thái cũ: lệnh không có hiệu lực — theo máy và báo.
      log = appendLog({ ...p, log }, 'warn', powerPending.to === 'on' ? 'Power on: the projector did not start' : 'Power off: the projector did not shut down')
      powerPending = undefined
    }
  }

  return {
    ...p,
    connection: 'connected',
    power,
    powerPending,
    shutter: s.shutter ?? p.shutter,
    osd: s.osd ?? p.osd,
    input: isInputSource(s.input) ? s.input : p.input,
    errors: s.errors,
    testPattern: s.testPattern ? { enabled: s.testPattern.enabled, type: isTestPattern(s.testPattern.pattern) ? s.testPattern.pattern : p.testPattern.type } : p.testPattern,
    log,
    telemetry: {
      ...p.telemetry,
      lampHours: s.lampHours ?? p.telemetry.lampHours,
      temperatureC: s.temperatureC ?? p.telemetry.temperatureC,
      sensors: s.temperatures ?? p.telemetry.sensors,
      lensReading: s.lens ?? p.telemetry.lensReading,
      // Máy báo được độ sáng thật (Panasonic) thì theo máy; không thì giá trị của app khi bật, 0 khi tắt.
      brightness: s.brightness ?? (power === 'on' ? p.telemetry.brightness || DEFAULT_BRIGHTNESS : 0),
    },
  }
}

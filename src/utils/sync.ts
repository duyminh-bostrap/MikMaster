import type { StatusDto } from '../../shared/api.ts'
import { INPUT_SOURCES } from '@/constants/inputs'
import { DEFAULT_BRIGHTNESS, appendLog } from '@/utils/projector'
import type { ConnectionStatus, InputSource, Projector } from '@/types'

export type SyncResult = { ok: true; status: StatusDto } | { ok: false; code: string; message: string }

const LINK_DOWN = new Set(['connect', 'timeout', 'network'])
const LINK_REJECTED = new Set(['protocol', 'unsupported'])

const FAILURE_LABEL: Record<ConnectionStatus, string | null> = { connected: null, disconnected: 'Offline', 'protocol-error': 'Protocol error', 'auth-failed': 'Login required' }
const OWN_LABELS = new Set(['Offline', 'Protocol error', 'Login required'])

function isInputSource(label: string | undefined): label is InputSource {
  return !!label && (INPUT_SOURCES as readonly string[]).includes(label)
}

/** Áp kết quả đọc/ghi từ thiết bị thật vào model; hàm thuần để reducer gọi. */
export function applyRemote(p: Projector, r: SyncResult): Projector {
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

  // PJLink/Panasonic/Christie không có trạng thái "off" riêng: máy tắt báo "standby".
  // Giữ "off" nếu người vận hành vừa tắt để nút OFF không tự nhảy về STBY.
  const power = s.power === 'on' || s.power === 'warmup' ? 'on' : s.power === undefined ? p.power : p.power === 'off' ? 'off' : 'standby'

  return {
    ...p,
    connection: 'connected',
    power,
    shutter: s.shutter ?? p.shutter,
    input: isInputSource(s.input) ? s.input : p.input,
    errors: s.errors,
    log,
    telemetry: {
      ...p.telemetry,
      lampHours: s.lampHours ?? p.telemetry.lampHours,
      temperatureC: s.temperatureC ?? p.telemetry.temperatureC,
      brightness: power === 'on' ? p.telemetry.brightness || DEFAULT_BRIGHTNESS : 0,
    },
  }
}

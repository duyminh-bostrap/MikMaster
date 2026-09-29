import { applyLensDelta, buildLensPreset } from '@/utils/lens'
import { applyPower, appendLog } from '@/utils/projector'
import { withCredentials } from '@/utils/credentials'
import { applyRemote, type SyncResult } from '@/utils/sync'
import type {
  Booth,
  LensPosition,
  LensSlot,
  PowerState,
  Project,
  Projector,
  TestPatternState,
  LensPresetSlots,
} from '@/types'

export interface ProjectState {
  project: Project | null
  booths: Booth[]
  projectors: Projector[]
}

export const initialProjectState: ProjectState = { project: null, booths: [], projectors: [] }

export type ProjectAction =
  | { type: 'project/launch'; payload: { project: Project; booths: Booth[]; projectors: Projector[] } }
  | { type: 'project/close' }
  | { type: 'projector/patch'; id: string; patch: Partial<Omit<Projector, 'id'>> }
  | { type: 'projector/sync'; id: string; result: SyncResult }
  | { type: 'projector/log'; id: string; level: 'info' | 'warn' | 'error'; message: string }
  | { type: 'projectors/setCredentials'; ids: string[]; username?: string; password?: string }
  | { type: 'projectors/setPower'; ids: string[]; power: PowerState }
  | { type: 'projectors/setShutter'; ids: string[]; shutter: boolean }
  | { type: 'projector/setTestPattern'; id: string; patch: Partial<TestPatternState> }
  | { type: 'lens/adjust'; id: string; delta: Partial<LensPosition> }
  | { type: 'lens/resetShift'; id: string }
  | { type: 'lens/savePreset'; id: string; slot: LensSlot; name: string }
  | { type: 'lens/loadPreset'; id: string; slot: LensSlot }
  | { type: 'lens/unloadPreset'; id: string }

function mapProjectors(
  state: ProjectState,
  ids: readonly string[],
  fn: (p: Projector) => Projector,
): ProjectState {
  const target = new Set(ids)
  return { ...state, projectors: state.projectors.map(p => (target.has(p.id) ? fn(p) : p)) }
}

export function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case 'project/launch':
      return { ...action.payload }

    case 'project/close':
      return initialProjectState

    case 'projector/patch':
      return mapProjectors(state, [action.id], p => ({ ...p, ...action.patch }))

    case 'projector/sync':
      return mapProjectors(state, [action.id], p => applyRemote(p, action.result))

    case 'projector/log':
      return mapProjectors(state, [action.id], p => ({ ...p, log: appendLog(p, action.level, action.message) }))

    case 'projectors/setCredentials':
      // Đổi tài khoản = cho phép thử lại: máy đang bị từ chối xác thực được gỡ cờ lỗi để vòng poll kiểm tra lại.
      return mapProjectors(state, action.ids, p => {
        const next = withCredentials(p, { username: action.username, password: action.password })
        return p.connection === 'protocol-error'
          ? { ...next, connection: 'connected', errors: p.errors.filter(e => e !== 'Protocol error') }
          : next
      })

    case 'projectors/setPower':
      return mapProjectors(state, action.ids, p => applyPower(p, action.power))

    case 'projectors/setShutter':
      return mapProjectors(state, action.ids, p => ({ ...p, shutter: action.shutter }))

    case 'projector/setTestPattern':
      return mapProjectors(state, [action.id], p => ({ ...p, testPattern: { ...p.testPattern, ...action.patch } }))

    case 'lens/adjust':
      return mapProjectors(state, [action.id], p => ({
        ...p,
        lens: { ...p.lens, position: applyLensDelta(p.lens.position, action.delta), activePreset: null },
      }))

    case 'lens/resetShift':
      return mapProjectors(state, [action.id], p => ({
        ...p,
        lens: { ...p.lens, position: { ...p.lens.position, shiftX: 0, shiftY: 0 }, activePreset: null },
      }))

    case 'lens/savePreset':
      return mapProjectors(state, [action.id], p => {
        const presets = [...p.lens.presets] as LensPresetSlots
        presets[action.slot - 1] = buildLensPreset(action.slot, action.name, p.lens.position)
        return { ...p, lens: { ...p.lens, presets, activePreset: action.slot } }
      })

    case 'lens/loadPreset':
      return mapProjectors(state, [action.id], p => {
        const preset = p.lens.presets[action.slot - 1]
        if (!preset) return p
        return { ...p, lens: { ...p.lens, position: { ...preset.position }, activePreset: action.slot } }
      })

    case 'lens/unloadPreset':
      return mapProjectors(state, [action.id], p => ({ ...p, lens: { ...p.lens, activePreset: null } }))
  }
}

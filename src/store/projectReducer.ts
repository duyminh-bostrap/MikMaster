import { applyLensDelta, buildLensPreset } from '@/utils/lens'
import { applyPower, appendLog } from '@/utils/projector'
import { withCredentials } from '@/utils/credentials'
import { documentFingerprint } from '@/utils/document'
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
  /** Dấu vân tay lúc mở / lưu gần nhất; khác hiện tại = có thay đổi chưa lưu. */
  baseline: string
}

export const initialProjectState: ProjectState = { project: null, booths: [], projectors: [], baseline: '' }

export type ProjectAction =
  | { type: 'project/launch'; payload: { project: Project; booths: Booth[]; projectors: Projector[] } }
  | { type: 'project/close' }
  | { type: 'project/markSaved' }
  | { type: 'project/update'; patch: Partial<Pick<Project, 'name'>> }
  | { type: 'booth/add'; booth: Booth }
  | { type: 'booth/update'; id: string; patch: Partial<Pick<Booth, 'name'>> }
  | { type: 'booth/remove'; id: string; moveTo: string }
  | { type: 'projector/remove'; id: string }
  | { type: 'projector/add'; projector: Projector }
  | { type: 'projector/patch'; id: string; patch: Partial<Omit<Projector, 'id'>> }
  | { type: 'projector/sync'; id: string; result: SyncResult }
  | { type: 'projector/log'; id: string; level: 'info' | 'warn' | 'error'; message: string }
  | { type: 'projectors/setCredentials'; ids: string[]; username?: string; password?: string }
  | { type: 'projectors/move'; ids: string[]; boothId: string; boothName: string }
  | { type: 'projectors/setPower'; ids: string[]; power: PowerState }
  | { type: 'projectors/setShutter'; ids: string[]; shutter: boolean }
  | { type: 'projector/setTestPattern'; id: string; patch: Partial<TestPatternState> }
  | { type: 'projectors/setTestPattern'; ids: string[]; patch: Partial<TestPatternState> }
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
      return { ...action.payload, baseline: documentFingerprint(action.payload) }

    case 'project/markSaved':
      return { ...state, baseline: documentFingerprint(state) }

    case 'project/close':
      return initialProjectState

    case 'project/update':
      return state.project ? { ...state, project: { ...state.project, ...action.patch } } : state

    case 'booth/add':
      return { ...state, booths: [...state.booths, action.booth] }

    case 'booth/update':
      return { ...state, booths: state.booths.map(b => (b.id === action.id ? { ...b, ...action.patch } : b)) }

    case 'booth/remove': {
      // Không xoá booth cuối cùng; máy trong booth bị xoá chuyển sang `moveTo`.
      const target = state.booths.find(b => b.id === action.moveTo)
      if (state.booths.length <= 1 || !target || action.moveTo === action.id) return state
      return {
        ...state,
        booths: state.booths.filter(b => b.id !== action.id),
        projectors: state.projectors.map(p => (p.boothId === action.id ? { ...p, boothId: target.id, log: appendLog(p, 'info', `Moved to booth ${target.name}`) } : p)),
      }
    }

    case 'projector/add':
      return state.projectors.some(p => p.id === action.projector.id) ? state : { ...state, projectors: [...state.projectors, action.projector] }

    case 'projector/remove':
      return { ...state, projectors: state.projectors.filter(p => p.id !== action.id) }

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
        return p.connection === 'protocol-error' || p.connection === 'auth-failed'
          ? { ...next, connection: 'connected', errors: p.errors.filter(e => e !== 'Protocol error' && e !== 'Login required') }
          : next
      })

    case 'projectors/move':
      return mapProjectors(state, action.ids, p =>
        p.boothId === action.boothId ? p : { ...p, boothId: action.boothId, log: appendLog(p, 'info', `Moved to booth ${action.boothName}`) })

    case 'projectors/setPower':
      return mapProjectors(state, action.ids, p => applyPower(p, action.power))

    case 'projectors/setShutter':
      return mapProjectors(state, action.ids, p => ({ ...p, shutter: action.shutter }))

    case 'projectors/setTestPattern':
      return mapProjectors(state, action.ids, p => ({ ...p, testPattern: { ...p.testPattern, ...action.patch } }))

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

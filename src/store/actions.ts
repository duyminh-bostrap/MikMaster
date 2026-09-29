import type { Dispatch } from 'react'
import type { OsdKeyDto } from '../../shared/api.ts'
import type { SyncResult } from '@/utils/sync'
import type { InputSource, LensPosition, LensSlot, PowerState, Projector, TestPatternState } from '@/types'
import { getDeviceCredentials, getSharedCredentials } from '@/services/credentialCache'
import { fillMissingCredentials } from '@/utils/credentials'
import type { DeviceEffects } from './deviceEffects'
import type { ProjectAction, ProjectState } from './projectReducer'

/** Lớp API mà UI gọi; UI không bao giờ tự dựng action object. */
export function createProjectActions(dispatch: Dispatch<ProjectAction>, effects: DeviceEffects | null = null) {
  return {
    launchProject: (payload: Extract<ProjectAction, { type: 'project/launch' }>['payload']) =>
      dispatch({
        type: 'project/launch',
        payload: { ...payload, projectors: fillMissingCredentials(payload.projectors, { device: getDeviceCredentials, shared: getSharedCredentials }) },
      }),
    setCredentials: (ids: string[], creds: { username?: string; password?: string }) =>
      dispatch({ type: 'projectors/setCredentials', ids, ...creds }),
    closeProject: () => dispatch({ type: 'project/close' }),
    markSaved: () => dispatch({ type: 'project/markSaved' }),
    updateProject: (patch: { name?: string }) => dispatch({ type: 'project/update', patch }),
    addBooth: (name: string, location = '') => {
      const booth = { id: `booth-${Date.now().toString(36)}`, name, location }
      dispatch({ type: 'booth/add', booth })
      return booth
    },
    updateBooth: (id: string, patch: { name?: string; location?: string }) => dispatch({ type: 'booth/update', id, patch }),
    removeBooth: (id: string, moveTo: string) => dispatch({ type: 'booth/remove', id, moveTo }),
    removeProjector: (id: string) => dispatch({ type: 'projector/remove', id }),
    updateProjector: (id: string, patch: Partial<Omit<Projector, 'id'>>) =>
      dispatch({ type: 'projector/patch', id, patch }),
    moveToBooth: (ids: string[], booth: { id: string; name: string }) =>
      dispatch({ type: 'projectors/move', ids, boothId: booth.id, boothName: booth.name }),
    setPower: (ids: string[], power: PowerState) => {
      dispatch({ type: 'projectors/setPower', ids, power })
      effects?.power(ids, power)
    },
    setShutter: (ids: string[], shutter: boolean) => {
      dispatch({ type: 'projectors/setShutter', ids, shutter })
      effects?.shutter(ids, shutter)
    },
    setInput: (id: string, input: InputSource) => {
      dispatch({ type: 'projector/patch', id, patch: { input } })
      effects?.input(id, input)
    },
    sendOsd: (id: string, key: OsdKeyDto) => effects?.osd(id, key),
    syncProjector: (id: string, result: SyncResult) => dispatch({ type: 'projector/sync', id, result }),
    logEvent: (id: string, level: 'info' | 'warn' | 'error', message: string) => dispatch({ type: 'projector/log', id, level, message }),
    setTestPattern: (id: string, patch: Partial<TestPatternState>) =>
      dispatch({ type: 'projector/setTestPattern', id, patch }),
    adjustLens: (id: string, delta: Partial<LensPosition>) => dispatch({ type: 'lens/adjust', id, delta }),
    resetLensShift: (id: string) => dispatch({ type: 'lens/resetShift', id }),
    saveLensPreset: (id: string, slot: LensSlot, name: string) =>
      dispatch({ type: 'lens/savePreset', id, slot, name }),
    loadLensPreset: (id: string, slot: LensSlot) => dispatch({ type: 'lens/loadPreset', id, slot }),
    unloadLensPreset: (id: string) => dispatch({ type: 'lens/unloadPreset', id }),
  }
}

export type ProjectActions = ReturnType<typeof createProjectActions>
export type { ProjectState }

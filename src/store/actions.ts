import type { Dispatch } from 'react'
import type { LensPosition, LensSlot, PowerState, Projector, TestPatternState } from '@/types'
import type { ProjectAction, ProjectState } from './projectReducer'

/** Lớp API mà UI gọi; UI không bao giờ tự dựng action object. */
export function createProjectActions(dispatch: Dispatch<ProjectAction>) {
  return {
    launchProject: (payload: NonNullable<Extract<ProjectAction, { type: 'project/launch' }>['payload']>) =>
      dispatch({ type: 'project/launch', payload }),
    closeProject: () => dispatch({ type: 'project/close' }),
    updateProjector: (id: string, patch: Partial<Omit<Projector, 'id'>>) =>
      dispatch({ type: 'projector/patch', id, patch }),
    setPower: (ids: string[], power: PowerState) => dispatch({ type: 'projectors/setPower', ids, power }),
    setShutter: (ids: string[], shutter: boolean) => dispatch({ type: 'projectors/setShutter', ids, shutter }),
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

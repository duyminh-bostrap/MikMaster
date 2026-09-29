import { useMemo, useReducer, useRef, type ReactNode } from 'react'
import { createProjectActions } from './actions'
import { createDeviceEffects } from './deviceEffects'
import { useGateway } from './useGateway'
import { ProjectActionsContext, ProjectStateContext } from './projectContext'
import { initialProjectState, projectReducer } from './projectReducer'

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, initialProjectState)
  const { gateway } = useGateway()
  const stateRef = useRef(state)
  stateRef.current = state
  // `dispatch` ổn định; actions chỉ tạo lại khi gateway đổi (phát hiện xong) → component chỉ dùng actions không re-render theo state.
  const actions = useMemo(
    () => createProjectActions(dispatch, gateway ? createDeviceEffects(gateway, id => stateRef.current.projectors.find(p => p.id === id), dispatch) : null),
    [gateway],
  )

  return (
    <ProjectActionsContext value={actions}>
      <ProjectStateContext value={state}>{children}</ProjectStateContext>
    </ProjectActionsContext>
  )
}

import { useMemo, useReducer, type ReactNode } from 'react'
import { createProjectActions } from './actions'
import { ProjectActionsContext, ProjectStateContext } from './projectContext'
import { initialProjectState, projectReducer } from './projectReducer'

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, initialProjectState)
  // `dispatch` ổn định nên actions chỉ tạo một lần → component chỉ dùng actions không re-render theo state.
  const actions = useMemo(() => createProjectActions(dispatch), [])

  return (
    <ProjectActionsContext value={actions}>
      <ProjectStateContext value={state}>{children}</ProjectStateContext>
    </ProjectActionsContext>
  )
}

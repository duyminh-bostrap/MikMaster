import { use } from 'react'
import type { ProjectActions } from './actions'
import { ProjectActionsContext, ProjectStateContext } from './projectContext'
import type { ProjectState } from './projectReducer'

export function useProjectState(): ProjectState {
  const ctx = use(ProjectStateContext)
  if (!ctx) throw new Error('useProjectState phải nằm trong <ProjectProvider>')
  return ctx
}

export function useProjectActions(): ProjectActions {
  const ctx = use(ProjectActionsContext)
  if (!ctx) throw new Error('useProjectActions phải nằm trong <ProjectProvider>')
  return ctx
}

/** Dùng bên dưới `ProjectGuard`: project luôn tồn tại. */
export function useOpenProject() {
  const { project, booths, projectors } = useProjectState()
  if (!project) throw new Error('useOpenProject được gọi khi chưa có project')
  return { project, booths, projectors }
}

export function useProjector(id: string | undefined) {
  const { projectors } = useProjectState()
  return projectors.find(p => p.id === id) ?? null
}

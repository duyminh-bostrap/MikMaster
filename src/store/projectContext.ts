import { createContext } from 'react'
import type { ProjectActions } from './actions'
import type { ProjectState } from './projectReducer'

export const ProjectStateContext = createContext<ProjectState | null>(null)
export const ProjectActionsContext = createContext<ProjectActions | null>(null)

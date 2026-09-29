import { RouterProvider } from 'react-router'
import { ProjectProvider } from '@/store/ProjectProvider'
import { router } from './router'

export default function App() {
  return (
    <ProjectProvider>
      <RouterProvider router={router} />
    </ProjectProvider>
  )
}

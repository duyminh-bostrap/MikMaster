import { RouterProvider } from 'react-router'
import { DeviceSync } from '@/store/DeviceSync'
import { GatewayProvider } from '@/store/GatewayProvider'
import { ProjectProvider } from '@/store/ProjectProvider'
import { UnloadGuard } from '@/store/UnloadGuard'
import { router } from './router'

export default function App() {
  return (
    <GatewayProvider>
      <ProjectProvider>
        <DeviceSync />
        <UnloadGuard />
        <RouterProvider router={router} />
      </ProjectProvider>
    </GatewayProvider>
  )
}

import { RouterProvider } from 'react-router'
import { DeviceSync } from '@/store/DeviceSync'
import { GatewayProvider } from '@/store/GatewayProvider'
import { ProjectProvider } from '@/store/ProjectProvider'
import { UnloadGuard } from '@/store/UnloadGuard'
import { StoppedScreen } from '@/features/gateway/StoppedScreen'
import { router } from './router'

export default function App() {
  return (
    <GatewayProvider>
      <ProjectProvider>
        <DeviceSync />
        <UnloadGuard />
        <StoppedScreen />
        <RouterProvider router={router} />
      </ProjectProvider>
    </GatewayProvider>
  )
}

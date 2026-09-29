import { RouterProvider } from 'react-router'
import { DeviceSync } from '@/store/DeviceSync'
import { GatewayProvider } from '@/store/GatewayProvider'
import { ProjectProvider } from '@/store/ProjectProvider'
import { router } from './router'

export default function App() {
  return (
    <GatewayProvider>
      <ProjectProvider>
        <DeviceSync />
        <RouterProvider router={router} />
      </ProjectProvider>
    </GatewayProvider>
  )
}

import { RouterProvider } from 'react-router'
import { DeviceSync } from '@/store/DeviceSync'
import { GatewayProvider } from '@/store/GatewayProvider'
import { ProjectProvider } from '@/store/ProjectProvider'
import { UnloadGuard } from '@/store/UnloadGuard'
import { ThemeSync } from '@/features/settings/ThemeSync'
import { SettingsHost } from '@/features/settings/SettingsHost'
import { PowerSequenceToast } from '@/features/dashboard/PowerSequenceToast'
import { StoppedScreen } from '@/features/gateway/StoppedScreen'
import { useSettings } from '@/services/settings'
import { router } from './router'

export default function App() {
  // Đổi ngôn ngữ → vẽ lại các trang (project đang mở nằm ở ProjectProvider phía trên nên không mất).
  const { language } = useSettings()
  return (
    <GatewayProvider>
      <ProjectProvider>
        <DeviceSync />
        <UnloadGuard />
        <ThemeSync />
        <PowerSequenceToast key={`seq-${language}`} />
        <StoppedScreen key={`stop-${language}`} />
        <RouterProvider key={language} router={router} />
        <SettingsHost />
      </ProjectProvider>
    </GatewayProvider>
  )
}

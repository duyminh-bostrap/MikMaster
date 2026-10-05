import { SettingsDialog } from './SettingsDialog'
import { closeSettings, useSettingsOpen } from './settingsOpen'

/** Đặt ngoài router: đổi ngôn ngữ vẽ lại các trang nhưng hộp thoại cài đặt vẫn mở. */
export function SettingsHost() {
  return useSettingsOpen() ? <SettingsDialog onClose={closeSettings} /> : null
}

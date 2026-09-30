import { openSettings } from '@/features/settings/settingsOpen'
import { Badge } from '@/components/ui/Badge'
import { licenseNotice } from '@/utils/licenseNotice'
import { useLicense } from '@/services/license'
import { useGateway } from '@/store/useGateway'
import { t } from '@/i18n'

/** Chỉ hiện khi cần chú ý (sắp hết dùng thử / hết hạn / cần kết nối mạng kiểm tra / bị giới hạn). Bấm để mở Cài đặt. */
export function LicenseBadge() {
  const { gateway } = useGateway()
  const s = useLicense(gateway)
  const notice = s ? licenseNotice(s) : null
  if (!notice) return null
  return (
    <button type="button" onClick={openSettings} title={t('Open Settings to check the license')}>
      <Badge tone={notice.tone}>{t(notice.text, notice.vars)}</Badge>
    </button>
  )
}

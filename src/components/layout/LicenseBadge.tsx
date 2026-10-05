import { openSettings } from '@/features/settings/settingsOpen'
import { Badge } from '@/components/ui/Badge'
import { licenseNotice } from '@/utils/licenseNotice'
import { openLicensePage, useLicense } from '@/services/license'
import { useGateway } from '@/store/useGateway'
import { t } from '@/i18n'

/** Chỉ hiện khi cần chú ý (bản Free / sắp hết hạn / cần kết nối mạng kiểm tra). Bản Free: bấm để mở trang license; còn lại mở Cài đặt. */
export function LicenseBadge() {
  const { gateway } = useGateway()
  const s = useLicense(gateway)
  const notice = s ? licenseNotice(s) : null
  if (!notice) return null
  return (
    <button type="button" onClick={s?.edition === 'free' ? openLicensePage : openSettings} title={s?.edition === 'free' ? t('Enter a license key to unlock Pro') : t('Open Settings to check the license')}>
      <Badge tone={notice.tone}>{t(notice.text, notice.vars)}</Badge>
    </button>
  )
}

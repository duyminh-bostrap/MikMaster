import { openSettings } from '@/features/settings/settingsOpen'
import { Badge } from '@/components/ui/Badge'
import { useLicense } from '@/services/license'
import { useGateway } from '@/store/useGateway'
import { t } from '@/i18n'

/** Chỉ hiện khi cần chú ý: sắp hết dùng thử (≤ 7 ngày), hết dùng thử hoặc license hết hạn. Bấm để mở Cài đặt. */
export function LicenseBadge() {
  const { gateway } = useGateway()
  const s = useLicense(gateway)
  if (!s || s.state === 'licensed' || (s.state === 'trial' && (s.trialDaysLeft ?? 0) > 7)) return null
  const label = s.state === 'trial' ? t('TRIAL · {n} day(s) left', { n: s.trialDaysLeft ?? 0 }) : s.state === 'expired' ? t('LICENSE EXPIRED') : t('TRIAL ENDED · ENTER LICENSE')
  return (
    <button type="button" onClick={openSettings} title={t('Open Settings to enter a license key')}>
      <Badge tone={s.state === 'trial' ? 'warn' : 'danger'}>{label}</Badge>
    </button>
  )
}

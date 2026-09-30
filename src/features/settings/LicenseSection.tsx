import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import type { LicenseStatusDto } from '../../../shared/api.ts'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useT } from '@/i18n'
import { setLicenseStatus, useLicense } from '@/services/license'
import { useGateway } from '@/store/useGateway'

function StateBadge({ s }: { s: LicenseStatusDto }) {
  const t = useT()
  if (s.state === 'licensed') return <Badge tone="ok">{t('LICENSED')}</Badge>
  if (s.state === 'trial') return <Badge tone="warn">{t('TRIAL · {n} day(s) left', { n: s.trialDaysLeft ?? 0 })}</Badge>
  return <Badge tone="danger">{s.state === 'expired' ? t('LICENSE EXPIRED') : t('TRIAL ENDED')}</Badge>
}

/** Bản quyền MikMaster: xem trạng thái, nhập / gỡ khoá. Cần gateway (khoá kiểm và lưu ở gateway). */
export function LicenseSection() {
  const t = useT()
  const { gateway } = useGateway()
  const s = useLicense(gateway)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!gateway || !s) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-xs text-muted-foreground">{t('LICENSE')}</span>
        <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">{t('The license is managed by the gateway — it is available when MikMaster is connected to it.')}</p>
      </div>
    )
  }

  async function activate() {
    setBusy(true); setError('')
    const r = await gateway!.installLicense(key.trim())
    setBusy(false)
    if (r.ok) { setLicenseStatus(r.value); setKey('') } else setError(r.message)
  }
  async function remove() {
    const r = await gateway!.removeLicense()
    if (r.ok) setLicenseStatus(r.value)
  }

  const limit = s.maxProjectors === 0 ? t('unlimited') : String(s.maxProjectors)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">{t('LICENSE')}</span>
        <StateBadge s={s} />
      </div>
      {(s.state === 'licensed' || s.state === 'expired') && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
          <dt className="text-muted-foreground">{t('Licensed to')}</dt><dd className="text-foreground">{s.licensee}</dd>
          <dt className="text-muted-foreground">{t('Projectors')}</dt><dd className="text-foreground">{limit}</dd>
          <dt className="text-muted-foreground">{t('Valid until')}</dt><dd className="text-foreground">{s.expiresAt ? s.expiresAt.slice(0, 10) : t('no expiry')}</dd>
        </dl>
      )}
      {s.restricted && (
        <p className="font-mono text-[10px] leading-relaxed text-danger">
          {t('Without a valid license MikMaster only shows the status of up to {n} projectors and sends no commands.', { n: s.freeLimit })}
        </p>
      )}
      <div className="flex gap-2">
        <input value={key} onChange={e => { setKey(e.target.value); setError('') }} placeholder="MIKM1.…" spellCheck={false} autoComplete="off" aria-label={t('License key')}
          onKeyDown={e => { if (e.key === 'Enter' && key.trim() && !busy) { e.preventDefault(); void activate() } }}
          className="min-w-0 flex-1 rounded-sm border border-border bg-muted px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary/60" />
        <Button type="button" variant="primary" disabled={!key.trim() || busy} onClick={() => void activate()}>
          <KeyRound size={12} />{busy ? t('CHECKING…') : t('ACTIVATE')}
        </Button>
      </div>
      {error && <p role="alert" className="font-mono text-[10px] text-danger">{error}</p>}
      {s.state === 'licensed' && <Button type="button" size="xs" className="self-start text-muted-foreground" onClick={() => void remove()}>{t('REMOVE LICENSE')}</Button>}
    </div>
  )
}

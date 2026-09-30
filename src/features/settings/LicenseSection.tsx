import { Check, Copy, KeyRound, LogOut, RefreshCw, Unplug } from 'lucide-react'
import { useState } from 'react'
import type { LicenseStatusDto } from '../../../shared/api.ts'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useT } from '@/i18n'
import { setLicenseStatus, useLicense } from '@/services/license'
import { licenseNotice } from '@/utils/licenseNotice'
import { useGateway } from '@/store/useGateway'

function StateBadge({ s }: { s: LicenseStatusDto }) {
  const t = useT()
  const notice = licenseNotice(s)
  if (notice) return <Badge tone={notice.tone}>{t(notice.text, notice.vars)}</Badge>
  return <Badge tone="ok">{t('LICENSED')}</Badge>
}

/** Bản quyền MikMaster: xem trạng thái, nhập / gỡ khoá. Cần gateway (khoá kiểm và lưu ở gateway). */
export function LicenseSection() {
  const t = useT()
  const { gateway } = useGateway()
  const s = useLicense(gateway)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [checking, setChecking] = useState(false)
  const [confirmDialog, confirm] = useConfirm()

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
  async function checkOnline() {
    setChecking(true)
    const r = await gateway!.checkLicenseOnline()
    setChecking(false)
    if (r.ok) setLicenseStatus(r.value)
  }
  async function signOut() {
    const r = await gateway!.accountSignOut()
    if (r.ok) setLicenseStatus(r.value.license)
  }
  async function release() {
    const ok = await confirm({
      title: t('RELEASE LICENSE FROM THIS COMPUTER'),
      message: t('This computer will go back to the trial / limited mode. You get a release code to send to the license issuer, who then issues a key for the other computer.'),
      confirmLabel: t('RELEASE'), tone: 'warn',
    })
    if (!ok) return
    const r = await gateway!.removeLicense()
    if (r.ok) setLicenseStatus(r.value)
  }
  async function copy(what: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(c => (c === what ? '' : c)), 1500) } catch { /* trình duyệt chặn clipboard → người dùng tự chọn và copy */ }
  }
  const CopyButton = ({ what, text }: { what: string; text: string }) => (
    <Button type="button" size="xs" aria-label={t('Copy')} title={t('Copy')} onClick={() => void copy(what, text)}>
      {copied === what ? <Check size={11} /> : <Copy size={11} />}
    </Button>
  )

  const limit = s.maxProjectors === 0 ? t('unlimited') : String(s.maxProjectors)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">{t('LICENSE')}</span>
        <StateBadge s={s} />
      </div>
      {s.account?.configured && (
        <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
          <span className="text-muted-foreground">{t('Account')}</span>
          <span className="flex items-center gap-2">
            <span className="text-foreground">{s.account.signedIn ? s.account.email : t('not signed in')}</span>
            {s.account.signedIn && <Button type="button" size="xs" onClick={() => void signOut()}><LogOut size={10} />{t('SIGN OUT')}</Button>}
          </span>
        </div>
      )}
      {(s.state === 'licensed' || s.state === 'expired' || s.state === 'unverified' || s.state === 'revoked') && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
          <dt className="text-muted-foreground">{t('Licensed to')}</dt><dd className="text-foreground">{s.licensee}</dd>
          <dt className="text-muted-foreground">{t('Projectors')}</dt><dd className="text-foreground">{limit}</dd>
          <dt className="text-muted-foreground">{t('Valid until')}</dt><dd className="text-foreground">{s.expiresAt ? s.expiresAt.slice(0, 10) : t('no expiry')}</dd>
          {s.online?.configured && <><dt className="text-muted-foreground">{t('Last online check')}</dt><dd className="text-foreground">{s.online.lastCheckAt ? s.online.lastCheckAt.slice(0, 10) : '—'}</dd></>}
        </dl>
      )}
      {s.online?.configured && (s.account?.signedIn || (s.state !== 'trial' && s.state !== 'unlicensed')) && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground">
            <span>{s.state === 'unverified' ? t('The license was not verified online for 30 days. Connect to the internet and check again.') : t('The license must be verified online at least every 30 days — {n} day(s) left.', { n: s.online.daysLeft ?? 0 })}</span>
            <Button type="button" size="xs" disabled={checking} onClick={() => void checkOnline()}><RefreshCw size={10} className={checking ? 'animate-spin' : ''} />{t('CHECK NOW')}</Button>
          </div>
          {s.online.lastError && <p className="font-mono text-[10px] text-danger">{t('Online check failed: {message}', { message: s.online.lastError })}</p>}
        </div>
      )}
      {s.restricted && (
        <p className="font-mono text-[10px] leading-relaxed text-danger">
          {t('Without a valid license MikMaster only shows the status of up to {n} projectors and sends no commands.', { n: s.freeLimit })}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
        <span className="text-muted-foreground">{t('Machine code')}</span>
        <span className="flex items-center gap-1.5"><span className="text-foreground select-all">{s.machineCode}</span><CopyButton what="machine" text={s.machineCode} /></span>
      </div>
      {s.releaseCode && (
        <div className="flex flex-col gap-1 rounded-sm border border-ok/40 bg-ok/5 p-2">
          <span className="font-mono text-[10px] text-ok">{t('Released. Send this release code and the new computer\'s machine code to the license issuer:')}</span>
          <div className="flex items-start gap-1.5">
            <code className="min-w-0 flex-1 font-mono text-[10px] break-all text-foreground select-all">{s.releaseCode}</code>
            <CopyButton what="release" text={s.releaseCode} />
          </div>
        </div>
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
      {s.id && (s.state === 'licensed' || s.state === 'expired') && (
        <Button type="button" size="xs" className="self-start" onClick={() => void release()}><Unplug size={11} />{t('RELEASE LICENSE FROM THIS COMPUTER')}</Button>
      )}
      {confirmDialog}
    </div>
  )
}

import { Check, Copy, KeyRound, LogIn, Unplug, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { AppLogo } from '@/components/layout/AppLogo'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { useT } from '@/i18n'
import { closeLicensePage, setLicenseStatus, useLicense, useLicensePageWanted } from '@/services/license'
import { useGateway } from '@/store/useGateway'
import { cn } from '@/utils/cn'

type Tab = 'signin' | 'signup' | 'key'

/**
 * Trang license: nhập khoá (hoặc, nếu đã cấu hình hệ thống tài khoản, đăng nhập / tạo tài khoản Free 30 ngày) để mở khoá bản Pro.
 * Hiện khi mở app ở bản Free và bỏ qua được ("tiếp tục với bản Free": chỉ bật / tắt máy và shutter); mở lại từ nút UNLOCK PRO / huy hiệu.
 * Khoá đã cài mà hết hạn / quá hạn cập nhật / chưa xác minh: có nút gỡ khoá khỏi máy này để chuyển sang máy khác (nhận "mã gỡ" gửi người cấp khoá).
 */
export function AuthGate() {
  const t = useT()
  const { gateway } = useGateway()
  const license = useLicense(gateway)
  const wanted = useLicensePageWanted()
  const [tab, setTab] = useState<Tab>('key')
  const [askRelease, setAskRelease] = useState(false)
  const [copiedRelease, setCopiedRelease] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [copied, setCopied] = useState(false)

  // Chỉ ở bản Free (chưa có license Pro): có quyền Pro rồi thì không thấy gì.
  if (!gateway || !license || license.edition !== 'free' || !wanted) return null
  const kind = license.account?.kind
  const accounts = !!license.account?.configured
  // Có hệ thống tài khoản thì mặc định mở thẻ đăng nhập; không thì chỉ có ô nhập khoá.
  const current: Tab = accounts ? tab : 'key'
  const reason =
    license.state === 'unlicensed' && !kind ? t('No license on this computer yet. Enter a license key to start. A 30-day free trial key is issued when you create an account on our website.') :
    kind === 'machine_used' ? t('This computer has already used its free 30 days with another account. Sign in with that account, or enter a license key.')
    : kind === 'other_machine' ? t('This account already used its free 30 days on another computer. Enter a license key to use it here.')
    : kind === 'expired' || license.state === 'expired' ? t('The 30 days are over. Enter a license key, or contact us to upgrade.')
    : license.state === 'unverified' ? t('The license could not be verified online for 30 days. Connect this computer to the internet and sign in again.')
    : license.state === 'outdated' ? t('This version was released after your updates ended on {date}. Your license still works with any earlier version — install one released on or before that date, or renew your updates.', { date: license.updatesUntil?.slice(0, 10) ?? '' })
    : license.state === 'revoked' ? t('This license has been revoked.')
    : ''

  async function submit() {
    setBusy(true); setError(''); setInfo('')
    try {
      if (current === 'key') {
        const r = await gateway!.installLicense(key.trim())
        if (r.ok) { setLicenseStatus(r.value); setKey('') } else setError(r.message)
        return
      }
      const r = current === 'signup' ? await gateway!.accountSignUp(email.trim(), password) : await gateway!.accountSignIn(email.trim(), password)
      if (!r.ok) { setError(r.message); return }
      setLicenseStatus(r.value.license)
      if (r.value.confirmEmail) { setInfo(t('Account created. Open the confirmation link we emailed you, then sign in.')); setTab('signin'); setPassword('') }
    } finally { setBusy(false) }
  }

  async function release() {
    setError('')
    const r = await gateway!.removeLicense()
    if (r.ok) setLicenseStatus(r.value); else setError(r.message)
  }

  const canSubmit = !busy && (current === 'key' ? key.trim() !== '' : email.trim() !== '' && password.length >= 6)
  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && canSubmit) { e.preventDefault(); void submit() } }
  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'signin', label: t('SIGN IN'), icon: <LogIn size={12} /> },
    { id: 'signup', label: t('FREE 30 DAYS'), icon: <UserPlus size={12} /> },
    { id: 'key', label: t('LICENSE KEY'), icon: <KeyRound size={12} /> },
  ]

  return (
    <div role="dialog" aria-modal="true" aria-label={t('Sign in to MikMaster')} className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 overflow-y-auto bg-background p-6">
      <AppLogo size="lg" />
      <div className="w-full max-w-md rounded-sm border border-border bg-card p-5">
        <h1 className="mb-1 font-mono text-sm tracking-[0.15em] text-primary">{accounts ? t('SIGN IN TO MIKMASTER') : t('LICENSE REQUIRED')}</h1>
        <p className="mb-4 font-mono text-[11px] leading-relaxed text-muted-foreground">{accounts ? t('Sign in, create a free account for 30 days, or enter an offline license key.') : t('Enter your license key to use MikMaster.')}</p>

        {accounts && <div role="tablist" className="mb-4 flex gap-1.5">
          {TABS.map(x => (
            <Button key={x.id} role="tab" aria-selected={current === x.id} variant="accent" size="sm" selected={current === x.id} className="flex-1" onClick={() => { setTab(x.id); setError(''); setInfo('') }}>
              {x.icon}{x.label}
            </Button>
          ))}
        </div>}

        {reason && <p className="mb-3 rounded-sm border border-warn/40 bg-warn/10 px-3 py-2 font-mono text-[11px] leading-relaxed text-warn">{reason}</p>}
        {info && <p role="status" className="mb-3 rounded-sm border border-ok/40 bg-ok/10 px-3 py-2 font-mono text-[11px] leading-relaxed text-ok">{info}</p>}

        <div className="flex flex-col gap-3">
          {current === 'key' ? (
            <>
              <label className="flex flex-col gap-1.5 font-mono text-xs text-muted-foreground">
                {t('License key')}
                <TextInput value={key} onChange={e => { setKey(e.target.value); setError('') }} onKeyDown={onEnter} placeholder="MIKM2-…" spellCheck={false} autoComplete="off" autoFocus />
              </label>
              <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
                <span>{t('Machine code')}: <span className="text-foreground select-all">{license.machineCode}</span></span>
                <Button size="xs" aria-label={t('Copy')} onClick={() => { void navigator.clipboard?.writeText(license.machineCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }, () => undefined) }}>
                  <Copy size={10} />{copied ? t('Copied') : t('Copy')}
                </Button>
              </div>
              <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">{t('Send the machine code to the license issuer to get a key for this computer. Keys work offline.')}</p>
              {license.releaseCode && (
                <div className="flex flex-col gap-1 rounded-sm border border-ok/40 bg-ok/5 p-2">
                  <span className="font-mono text-[10px] text-ok">{t('Released. Send this release code and the new computer\'s machine code to the license issuer:')}</span>
                  <div className="flex items-start gap-1.5">
                    <code className="min-w-0 flex-1 font-mono text-[10px] break-all text-foreground select-all">{license.releaseCode}</code>
                    <Button size="xs" aria-label={t('Copy')} onClick={() => { void navigator.clipboard?.writeText(license.releaseCode!).then(() => { setCopiedRelease(true); setTimeout(() => setCopiedRelease(false), 1500) }, () => undefined) }}>
                      {copiedRelease ? <Check size={10} /> : <Copy size={10} />}
                    </Button>
                  </div>
                </div>
              )}
              {license.id && license.state !== 'revoked' && (askRelease ? (
                <div className="flex flex-col gap-2 rounded-sm border border-warn/40 bg-warn/10 p-2">
                  <span className="font-mono text-[10px] leading-relaxed text-warn">{t('This computer will stop using this key. You get a release code to send to the license issuer, who then issues a key for the other computer.')}</span>
                  <div className="flex gap-2">
                    <Button size="xs" variant="warn" onClick={() => { setAskRelease(false); void release() }}>{t('RELEASE')}</Button>
                    <Button size="xs" onClick={() => setAskRelease(false)}>{t('CANCEL')}</Button>
                  </div>
                </div>
              ) : (
                <Button size="xs" className="self-start" onClick={() => setAskRelease(true)}><Unplug size={11} />{t('RELEASE LICENSE FROM THIS COMPUTER')}</Button>
              ))}
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1.5 font-mono text-xs text-muted-foreground">
                {t('EMAIL')}
                <TextInput type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }} onKeyDown={onEnter} autoComplete="email" autoFocus />
              </label>
              <label className="flex flex-col gap-1.5 font-mono text-xs text-muted-foreground">
                {t('PASSWORD')}
                <TextInput type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }} onKeyDown={onEnter} autoComplete={current === 'signup' ? 'new-password' : 'current-password'} />
              </label>
              {current === 'signup' && <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">{t('Free for 30 days on this computer. Each account and each computer gets one free period. At least 6 characters.')}</p>}
            </>
          )}
          {error && <p role="alert" className={cn('font-mono text-[11px] leading-relaxed text-danger')}>{error}</p>}
          <Button variant="primary" size="md" disabled={!canSubmit} onClick={() => void submit()}>
            {busy ? t('CHECKING…') : current === 'signin' ? t('SIGN IN') : current === 'signup' ? t('CREATE FREE ACCOUNT') : t('ACTIVATE')}
          </Button>
        </div>
      </div>
      <div className="w-full max-w-md rounded-sm border border-border bg-card p-4 font-mono text-[11px] leading-relaxed">
        <p className="text-muted-foreground"><span className="text-foreground">{t('FREE EDITION')}</span> — {t('power on / off and shutter')}</p>
        <p className="mt-1 text-muted-foreground"><span className="font-bold text-primary">PRO</span> — {t('live preview, test patterns, OSD, input, lens, brightness')}</p>
        <Button size="md" className="mt-3 w-full" onClick={closeLicensePage}>{t('CONTINUE WITH THE FREE EDITION')}</Button>
      </div>
      {accounts && <p className="max-w-md text-center font-mono text-[10px] leading-relaxed text-muted-foreground">{t('Your password is sent only to the account server. MikMaster does not store it.')}</p>}
    </div>
  )
}

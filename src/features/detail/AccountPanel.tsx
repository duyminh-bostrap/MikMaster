import { LogIn, LogOut, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { QuickLoginsDto } from '../../../shared/api.ts'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field, PasswordInput, TextInput } from '@/components/ui/Field'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { forgetDeviceCredentials, saveDeviceCredentials, saveSharedCredentials } from '@/services/credentialCache'
import { useProjectActions, useProjectState } from '@/store/hooks'
import { useGateway } from '@/store/useGateway'
import { hasCredentials, hasWebLogin, lacksPassword, needsAuth, withCredentials } from '@/utils/credentials'
import { refreshQuickLogins } from '@/services/quickLogins'
import { BRAND_LABEL, brandOf } from '@/utils/quickLogin'
import type { Projector } from '@/types'
import { t } from '@/i18n'

const NETWORK_ERRORS = new Set(['connect', 'timeout', 'network'])

/**
 * Đăng nhập một máy. Chỉ hiện khi máy cần đăng nhập (`mode="required"`), hoặc khi người dùng bấm "Change"
 * để đổi tài khoản (`mode="change"`). Đăng nhập được kiểm thật qua gateway trước khi lưu; thành công thì
 * — nếu tích "Also use for…" — áp cùng tài khoản cho các máy khác đang thiếu, để không phải gõ lại cho từng hãng.
 */
export function AccountPanel({ projector: p, mode, onDone }: { projector: Projector; mode: 'required' | 'change'; onDone?: () => void }) {
  const { gateway } = useGateway()
  const { projectors } = useProjectState()
  const { setCredentials, logEvent } = useProjectActions()
  const [username, setUsername] = useState(p.network.protocol.username ?? '')
  const [password, setPassword] = useState(p.network.protocol.password ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [applyAll, setApplyAll] = useState(true)
  // Đăng nhập nhanh theo hãng: tài khoản người dùng tự lưu (mã hoá ở gateway), bấm một nút là đăng nhập.
  const brand = brandOf(p)
  const [quick, setQuick] = useState<QuickLoginsDto>({})
  const [saveQuick, setSaveQuick] = useState(true)
  useEffect(() => {
    if (!gateway) return
    let alive = true
    void gateway.getQuickLogins().then(r => { if (alive && r.ok) setQuick(r.value) })
    return () => { alive = false }
  }, [gateway])
  const quickLogin = brand ? quick[brand] : undefined

  const { ip, protocol } = p.network
  // Tài khoản web (Christie): chỉ cho live preview, kiểm bằng chính preview; không áp cho máy khác.
  const web = hasWebLogin(protocol.type)
  const others = web ? [] : projectors.filter(o => o.id !== p.id && needsAuth(o.network.protocol.type) && (lacksPassword(o) || o.connection === 'auth-failed'))
  const canSubmit = !busy && (username !== '' || password !== '')

  async function signIn(override?: { username: string; password: string }) {
    setBusy(true)
    setError('')
    const u = override?.username ?? username, pw = override?.password ?? password
    const creds = { username: u || undefined, password: pw || undefined }
    // Có gateway: thử thật trước khi lưu. Không có: chế độ mô phỏng, không có gì để kiểm.
    if (gateway) {
      const r = web ? await gateway.preview(withCredentials(p, creds)) : await gateway.status(withCredentials(p, creds))
      if (!r.ok) {
        setBusy(false)
        setError(
          r.code === 'auth' ? t('Wrong username or password.')
          : NETWORK_ERRORS.has(r.code) ? t('Cannot reach {ip} — this is not a login problem. Check the IP address, cable and power (try PING below).', { ip })
          : t('The device answered, but not as {protocol}: {message}', { protocol: protocol.type, message: r.message }),
        )
        return
      }
    }
    const ids = [p.id, ...(applyAll ? others.map(o => o.id) : [])]
    setCredentials(ids, creds)
    saveDeviceCredentials(ip, protocol.port, creds)
    if (applyAll) {
      saveSharedCredentials(creds)
      others.forEach(o => saveDeviceCredentials(o.network.ip, o.network.protocol.port, creds))
    }
    // Lưu làm đăng nhập nhanh cho hãng này (chỉ khi đã kiểm thật qua gateway, và không phải chính tài khoản nhanh).
    if (gateway && brand && !override && saveQuick) {
      const next = { ...quick, [brand]: { username: u, password: pw } }
      if ((await gateway.saveQuickLogins(next)).ok) { setQuick(next); void refreshQuickLogins(gateway) }
    }
    logEvent(p.id, 'info', `Signed in${u ? ` as ${u}` : ''}${override ? ' (quick login)' : ''}${gateway ? '' : ' (simulated, not verified)'}${applyAll && others.length ? `; same login applied to ${others.length} other device(s)` : ''}`)
    setBusy(false)
    onDone?.()
  }

  function signOut() {
    setCredentials([p.id], {})
    forgetDeviceCredentials(ip, protocol.port)
    logEvent(p.id, 'info', 'Signed out')
    onDone?.()
  }

  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && canSubmit) void signIn() }

  return (
    <div>
      <SectionHeader label={web ? t('WEB ACCOUNT') : mode === 'required' ? t('LOGIN REQUIRED') : t('CHANGE LOGIN')} />
      <div className="flex flex-col gap-2.5">
        {web && <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">{t('Used only for the live preview (projector web page). Control works without it.')}</p>}
        {mode === 'required' && (
          <p className="font-mono text-[10px] leading-relaxed text-warn">
            {p.connection === 'auth-failed' ? t('The projector refused the login.') : t('This projector is protected by a password.')} {t('Sign in to control it.')}
          </p>
        )}
        {quickLogin && brand && (
          <Button variant="accent" disabled={busy} onClick={() => void signIn(quickLogin)}>
            <Zap size={12} />{t('QUICK LOGIN · {brand}', { brand: BRAND_LABEL[brand] })} <span className="opacity-70">({quickLogin.username || '—'})</span>
          </Button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('USERNAME')}>{id => <TextInput id={id} value={username} autoComplete="off" autoFocus={mode === 'required'} onKeyDown={onEnter} onChange={e => { setUsername(e.target.value); setError('') }} className="px-2 py-1.5 text-xs" />}</Field>
          <Field label={t('PASSWORD')}>{id => <PasswordInput id={id} value={password} onKeyDown={onEnter} onChange={e => { setPassword(e.target.value); setError('') }} className="px-2 py-1.5 text-xs" />}</Field>
        </div>
        {others.length > 0 && (
          <label className="flex cursor-pointer items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <Checkbox checked={applyAll} onChange={setApplyAll} label={t('Use for all devices')} />
            {t('Also use for {n} other device(s) that need a login', { n: others.length })}
          </label>
        )}
        {gateway && brand && (
          <label className="flex cursor-pointer items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <Checkbox checked={saveQuick} onChange={setSaveQuick} label={t('Save as quick login')} />
            {quickLogin ? t('Replace the {brand} quick login with this account', { brand: BRAND_LABEL[brand] }) : t('Save as quick login for {brand} projectors', { brand: BRAND_LABEL[brand] })}
          </label>
        )}
        {error && <p role="alert" className="font-mono text-[10px] leading-relaxed text-danger">{error}</p>}
        <Button variant="primary" disabled={!canSubmit} onClick={() => void signIn()}>
          <LogIn size={12} />{busy ? t('CHECKING…') : t('SIGN IN')}
        </Button>
        {mode === 'change' && (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={onDone}>{t('CANCEL')}</Button>
            {(web ? hasCredentials(p) : !lacksPassword(p)) && <Button className="flex-1" onClick={signOut}><LogOut size={10} />{t('SIGN OUT')}</Button>}
          </div>
        )}
      </div>
    </div>
  )
}

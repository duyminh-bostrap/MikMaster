import { ArrowRight, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, PasswordInput, TextInput } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { getSharedCredentials } from '@/services/credentialCache'
import type { Credentials } from '@/utils/credentials'
import { t } from '@/i18n'

export const DEFAULT_LOGIN = { username: 'admin', password: 'admin' }

/**
 * Hai lối ra sau khi quét: LAUNCH (vào luôn, tài khoản nhập sau ở từng máy) hoặc
 * LOGIN & LAUNCH (một tài khoản cho mọi máy cần đăng nhập — mặc định admin/admin).
 */
export function LaunchPanel({ selected, loginTargets, onLaunch }: {
  selected: number
  loginTargets: number
  onLaunch: (login?: Credentials) => void
}) {
  const [login, setLogin] = useState(() => {
    const cached = getSharedCredentials()
    return cached ? { username: cached.username ?? '', password: cached.password ?? '' } : DEFAULT_LOGIN
  })
  const ready = selected > 0
  const devices = t('{n} DEVICE(S)', { n: selected })

  return (
    <Panel title={t('LAUNCH')} bodyClassName="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label={t('USERNAME')}>{id => <TextInput id={id} value={login.username} autoComplete="off" onChange={e => setLogin({ ...login, username: e.target.value })} className="px-2 py-1.5 text-xs" />}</Field>
        <Field label={t('PASSWORD')}>{id => <PasswordInput id={id} value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} className="px-2 py-1.5 text-xs" />}</Field>
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
        {loginTargets > 0 ? t('Used for {n} device(s) that need a login. Devices with a different login can be changed later on their page.', { n: loginTargets }) : t('No selected device needs a login.')}
      </p>
      <Button size="md" variant="primary" disabled={!ready || (!login.username && !login.password)} className="py-3 text-sm font-semibold tracking-[0.04em]"
        onClick={() => onLaunch({ username: login.username || undefined, password: login.password || undefined })}>
        <LogIn size={14} strokeWidth={2.5} />{t('LOGIN & LAUNCH')} — {devices}
      </Button>
      <Button size="md" variant="secondary" disabled={!ready} className="py-2.5" onClick={() => onLaunch()}>
        {ready ? <>{t('LAUNCH WITHOUT LOGIN')}<ArrowRight size={13} strokeWidth={2.5} /></> : t('SELECT DEVICES FIRST')}
      </Button>
    </Panel>
  )
}

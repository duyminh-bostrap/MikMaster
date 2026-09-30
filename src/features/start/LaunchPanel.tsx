import { ArrowRight, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, PasswordInput, TextInput } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { getSharedCredentials } from '@/services/credentialCache'
import type { Credentials, LoginGroup } from '@/utils/credentials'
import { t } from '@/i18n'

export const DEFAULT_LOGIN = { username: 'admin', password: 'admin' }
const EMPTY = { username: '', password: '' }

/**
 * Hai lối ra sau khi quét: LAUNCH (vào luôn, tài khoản nhập sau ở từng máy) hoặc
 * LOGIN & LAUNCH. Panel tự nhận ra các loại máy đang có (Panasonic, Christie…) và cho nhập một tài khoản cho MỖI loại;
 * loại bắt buộc điền sẵn admin/admin, loại tuỳ chọn (Christie: chỉ để xem live preview) để trống.
 */
export function LaunchPanel({ selected, groups, onLaunch }: {
  selected: number
  groups: LoginGroup[]
  onLaunch: (logins?: Record<string, Credentials>) => void
}) {
  const [logins, setLogins] = useState<Record<string, { username: string; password: string }>>({})
  const ready = selected > 0
  const devices = t('{n} DEVICE(S)', { n: selected })

  // Tài khoản đang nhập của một loại: chưa sửa thì lấy cache phiên (loại bắt buộc đầu tiên) hoặc mặc định.
  function valueOf(g: LoginGroup, index: number) {
    const own = logins[g.key]
    if (own) return own
    if (!g.required) return EMPTY
    const cached = index === 0 ? getSharedCredentials() : null
    return cached ? { username: cached.username ?? '', password: cached.password ?? '' } : DEFAULT_LOGIN
  }
  const set = (key: string, v: { username: string; password: string }) => setLogins(prev => ({ ...prev, [key]: v }))

  const values = groups.map((g, i) => [g, valueOf(g, i)] as const)
  const filled = values.filter(([, v]) => v.username || v.password)
  const multi = groups.length > 1

  function launchWithLogin() {
    onLaunch(Object.fromEntries(filled.map(([g, v]) => [g.key, { username: v.username || undefined, password: v.password || undefined }])))
  }

  return (
    <Panel title={t('LAUNCH')} bodyClassName="flex flex-col gap-3">
      {values.map(([g, v]) => (
        <div key={g.key} className="flex flex-col gap-2">
          {multi || !g.required ? (
            <div className="flex flex-col gap-0.5 font-mono text-[10px]">
              <p className="flex items-baseline justify-between gap-2 tracking-[0.1em] text-foreground">
                <span>{g.label.toUpperCase()}</span>
                <span className="shrink-0 text-muted-foreground">{t('{n} device(s)', { n: g.count })}</span>
              </p>
              {!g.required && <p className="text-muted-foreground">{t('optional: live preview')}</p>}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('USERNAME')}>{id => <TextInput id={id} value={v.username} autoComplete="off" aria-label={`${g.label} ${t('USERNAME')}`} onChange={e => set(g.key, { ...v, username: e.target.value })} className="px-2 py-1.5 text-xs" />}</Field>
            <Field label={t('PASSWORD')}>{id => <PasswordInput id={id} value={v.password} aria-label={`${g.label} ${t('PASSWORD')}`} onChange={e => set(g.key, { ...v, password: e.target.value })} className="px-2 py-1.5 text-xs" />}</Field>
          </div>
        </div>
      ))}
      <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
        {groups.length === 0 ? t('No selected device needs a login.')
          : multi ? t('One account per projector type. A device with a different login can be changed later on its page.')
          : t('Used for {n} device(s) that need a login. Devices with a different login can be changed later on their page.', { n: groups[0]!.count })}
      </p>
      <Button size="md" variant="primary" disabled={!ready || filled.length === 0} className="py-3 text-sm font-semibold tracking-[0.04em]"
        onClick={launchWithLogin}>
        <LogIn size={14} strokeWidth={2.5} />{t('LOGIN & LAUNCH')} — {devices}
      </Button>
      <Button size="md" variant="secondary" disabled={!ready} className="py-2.5" onClick={() => onLaunch()}>
        {ready ? <>{t('LAUNCH WITHOUT LOGIN')}<ArrowRight size={13} strokeWidth={2.5} /></> : t('SELECT DEVICES FIRST')}
      </Button>
    </Panel>
  )
}

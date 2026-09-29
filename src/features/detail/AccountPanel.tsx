import { LogIn, LogOut } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field, PasswordInput, TextInput } from '@/components/ui/Field'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { forgetDeviceCredentials, saveDeviceCredentials, saveSharedCredentials } from '@/services/credentialCache'
import { useProjectActions, useProjectState } from '@/store/hooks'
import { useGateway } from '@/store/useGateway'
import { hasCredentials, needsAuth, withCredentials } from '@/utils/credentials'
import type { Projector } from '@/types'

/**
 * Đăng nhập từng máy. Đăng nhập thành công mới ghi cache (sessionStorage) và — nếu tích "Use for all devices" —
 * áp cùng tài khoản cho các máy khác chưa có tài khoản, để không phải gõ lại cho từng hãng.
 */
export function AccountPanel({ projector: p }: { projector: Projector }) {
  const { gateway } = useGateway()
  const { projectors } = useProjectState()
  const { setCredentials, logEvent } = useProjectActions()
  const [username, setUsername] = useState(p.network.protocol.username ?? '')
  const [password, setPassword] = useState(p.network.protocol.password ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [applyAll, setApplyAll] = useState(true)

  const { ip, protocol } = p.network
  const others = projectors.filter(o => o.id !== p.id && needsAuth(o.network.protocol.type) && !hasCredentials(o))
  const signedIn = hasCredentials(p) && p.connection === 'connected'
  const rejected = p.connection === 'protocol-error'
  const dirty = username !== (protocol.username ?? '') || password !== (protocol.password ?? '')
  const canSubmit = !busy && (username !== '' || password !== '')

  async function signIn() {
    setBusy(true)
    setError('')
    const creds = { username: username || undefined, password: password || undefined }
    // Có gateway: thử thật trước khi lưu. Không có: chế độ mô phỏng, không có gì để kiểm.
    if (gateway) {
      const r = await gateway.status(withCredentials(p, creds))
      if (!r.ok) {
        setBusy(false)
        setError(r.code === 'auth' || r.code === 'protocol' ? 'Wrong username or password.' : `Cannot verify: ${r.message}`)
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
    logEvent(p.id, 'info', `Signed in${username ? ` as ${username}` : ''}${gateway ? '' : ' (simulated, not verified)'}${applyAll && others.length ? `; same login applied to ${others.length} other device(s)` : ''}`)
    setBusy(false)
  }

  function signOut() {
    setCredentials([p.id], {})
    forgetDeviceCredentials(ip, protocol.port)
    setUsername('')
    setPassword('')
  }

  if (!needsAuth(protocol.type)) return null
  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && canSubmit) void signIn() }

  return (
    <>
      <div className="flex items-center justify-between">
        <SectionHeader label="ACCOUNT" />
      </div>
      <div className="mb-5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          {signedIn ? <Badge tone="ok">SIGNED IN{protocol.username ? ` · ${protocol.username}` : ''}</Badge>
            : rejected ? <Badge tone="danger">LOGIN REJECTED</Badge>
            : <Badge tone="warn">NOT SIGNED IN</Badge>}
          {hasCredentials(p) && <Button size="xs" variant="secondary" onClick={signOut}><LogOut size={10} />SIGN OUT</Button>}
        </div>
        {rejected && <p className="font-mono text-[10px] text-danger">The device refused the saved login. Enter the correct one below.</p>}
        <div className="grid grid-cols-2 gap-2">
          <Field label="USERNAME">{id => <TextInput id={id} value={username} autoComplete="off" onKeyDown={onEnter} onChange={e => { setUsername(e.target.value); setError('') }} className="px-2 py-1.5 text-xs" />}</Field>
          <Field label="PASSWORD">{id => <PasswordInput id={id} value={password} onKeyDown={onEnter} onChange={e => { setPassword(e.target.value); setError('') }} className="px-2 py-1.5 text-xs" />}</Field>
        </div>
        {others.length > 0 && (
          <label className="flex cursor-pointer items-center gap-2 font-mono text-[10px] text-muted-foreground">
            <Checkbox checked={applyAll} onChange={setApplyAll} label="Use for all devices" />
            Also use for {others.length} other device{others.length > 1 ? 's' : ''} without a login
          </label>
        )}
        {error && <p role="alert" className="font-mono text-[10px] text-danger">{error}</p>}
        <Button variant="primary" disabled={!canSubmit || (signedIn && !dirty)} onClick={() => void signIn()}>
          <LogIn size={12} />{busy ? 'CHECKING…' : signedIn ? 'UPDATE LOGIN' : 'SIGN IN'}
        </Button>
      </div>
    </>
  )
}

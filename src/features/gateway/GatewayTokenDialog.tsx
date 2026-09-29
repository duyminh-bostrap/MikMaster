import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, PasswordInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useGateway } from '@/store/useGateway'

/** Nhập token khi gateway chạy ở chế độ mở ra mạng (HOST=0.0.0.0 / MIKMASTER_TOKEN). Token được nhớ trong trình duyệt. */
export function GatewayTokenDialog({ onClose }: { onClose: () => void }) {
  const { unlock, tokenRejected } = useGateway()
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(tokenRejected ? 'The saved token was rejected. Enter the current one.' : '')

  async function submit() {
    if (!token.trim() || busy) return
    setBusy(true)
    setError('')
    const ok = await unlock(token)
    setBusy(false)
    if (ok) onClose()
    else setError('Token rejected (or the gateway stopped).')
  }

  return (
    <Modal title="GATEWAY ACCESS TOKEN" onClose={onClose} onSubmit={() => void submit()}
      footer={<div className="ml-auto flex gap-2"><Button onClick={onClose}>CANCEL</Button><Button type="submit" variant="primary" disabled={!token.trim() || busy}>{busy ? 'CHECKING…' : 'CONNECT'}</Button></div>}>
      <p className="text-sm text-foreground">This gateway is shared on the network and needs its access token.</p>
      <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
        The token is printed in the gateway console when it starts (or set with <code>MIKMASTER_TOKEN</code>). You can also open the app once with <code>?token=…</code> in the address.
      </p>
      <Field label="TOKEN">{id => <PasswordInput id={id} value={token} onChange={e => { setToken(e.target.value); setError('') }} />}</Field>
      {error && <p role="alert" className="font-mono text-[10px] text-danger">{error}</p>}
    </Modal>
  )
}

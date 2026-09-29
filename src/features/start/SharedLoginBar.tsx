import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PasswordInput, TextInput } from '@/components/ui/Field'

/** Một tài khoản cho mọi hãng: gõ một lần, áp cho tất cả máy đang đòi mật khẩu (máy tìm thấy sau đó tự điền). */
export function SharedLoginBar({ value, onChange, onApply, targets }: {
  value: { username: string; password: string }
  onChange: (v: { username: string; password: string }) => void
  onApply: () => number
  targets: number
}) {
  const [applied, setApplied] = useState<number | null>(null)
  const empty = !value.username && !value.password
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-muted px-4 py-2.5">
      <KeyRound size={13} className="text-accent" aria-hidden />
      <span className="mr-1 font-mono text-xs tracking-[0.08em] text-accent">SAME LOGIN FOR ALL</span>
      <TextInput aria-label="Shared username" placeholder="username" autoComplete="off" value={value.username} className="w-32 px-2 py-1.5 text-xs" onChange={e => { setApplied(null); onChange({ ...value, username: e.target.value }) }} />
      <PasswordInput aria-label="Shared password" placeholder="password" value={value.password} className="w-40 px-2 py-1.5 text-xs" onChange={e => { setApplied(null); onChange({ ...value, password: e.target.value }) }} />
      <Button size="xs" variant="accent" disabled={empty || targets === 0} onClick={() => setApplied(onApply())}>APPLY TO {targets} DEVICE{targets === 1 ? '' : 'S'}</Button>
      {applied !== null && <span className="font-mono text-[10px] text-ok" role="status">Applied to {applied}</span>}
    </div>
  )
}

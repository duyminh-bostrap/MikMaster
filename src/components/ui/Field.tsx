import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

const CONTROL =
  'w-full rounded-sm border bg-muted px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60'

export function TextInput({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(CONTROL, invalid ? 'border-danger/60' : 'border-border', className)} {...rest} />
}

/** Mật khẩu hiện sẵn (thiết bị AV, không phải tài khoản cá nhân); bấm mắt để che khi có người đứng cạnh. */
export function PasswordInput({ className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(true)
  return (
    <div className="relative">
      <input type={visible ? 'text' : 'password'} autoComplete="off" spellCheck={false} className={cn(CONTROL, 'border-border pr-7', className)} {...rest} />
      <button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(v => !v)}
        className="absolute inset-y-0 right-1.5 flex items-center text-muted-foreground transition-colors hover:text-foreground">
        {visible ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  )
}

export function SelectInput({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROL, 'border-border', className)} {...rest}>
      {children}
    </select>
  )
}

/** Nhãn + control; truyền control là hàm để nhận `id` gắn đúng label. */
export function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-mono text-xs text-muted-foreground">
        {label}
      </label>
      {children(id)}
    </div>
  )
}

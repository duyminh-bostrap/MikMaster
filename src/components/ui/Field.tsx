import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

const CONTROL =
  'w-full rounded-sm border bg-muted px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60'

export function TextInput({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(CONTROL, invalid ? 'border-danger/60' : 'border-border', className)} {...rest} />
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

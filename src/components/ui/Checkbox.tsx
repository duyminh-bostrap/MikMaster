import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-transparent',
      )}
    >
      {checked && <Check size={10} strokeWidth={3} />}
    </button>
  )
}

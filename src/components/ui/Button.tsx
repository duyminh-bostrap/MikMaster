import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'ok' | 'warn' | 'accent' | 'danger'
export type ButtonSize = 'xs' | 'sm' | 'md'

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-sm border font-mono font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'border-primary bg-primary text-primary-foreground hover:brightness-110',
  secondary: 'border-border bg-secondary text-secondary-foreground hover:bg-elevated-hover',
  ghost: 'border-transparent bg-transparent text-muted-foreground hover:text-foreground',
  ok: 'border-ok/25 bg-ok/10 text-ok hover:bg-ok/20',
  warn: 'border-warn/25 bg-warn/10 text-warn hover:bg-warn/20',
  accent: 'border-accent/25 bg-accent/10 text-accent hover:bg-accent/20',
  danger: 'border-danger/25 bg-danger/10 text-danger hover:bg-danger/20',
}

/** Dạng đậm khi nút đang ở trạng thái được chọn (toggle). */
const SELECTED: Record<ButtonVariant, string> = {
  primary: 'border-primary bg-primary text-primary-foreground',
  secondary: 'border-off bg-off text-foreground',
  ghost: 'border-border bg-secondary text-foreground',
  ok: 'border-ok bg-ok text-[#001a00]',
  warn: 'border-warn bg-warn text-[#1a0e00]',
  accent: 'border-accent bg-accent text-accent-foreground',
  danger: 'border-danger bg-danger text-white',
}

const SIZE: Record<ButtonSize, string> = {
  xs: 'px-1.5 py-0.5 text-[9px]',
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-xs',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  selected?: boolean
}

export function Button({ variant = 'secondary', size = 'sm', selected = false, className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={selected || undefined}
      className={cn(BASE, SIZE[size], selected ? SELECTED[variant] : VARIANT[variant], className)}
      {...rest}
    />
  )
}

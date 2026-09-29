import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import type { Tone } from '@/utils/tones'

const TONE: Record<Tone, string> = {
  ok: 'bg-ok/10 text-ok border-ok/25',
  warn: 'bg-warn/10 text-warn border-warn/25',
  danger: 'bg-danger/10 text-danger border-danger/25',
  accent: 'bg-accent/10 text-accent border-accent/25',
  off: 'bg-muted text-muted-foreground border-border',
}

export function Badge({ tone = 'off', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('rounded-sm border px-1.5 py-0.5 font-mono text-[10px] leading-none', TONE[tone], className)}>
      {children}
    </span>
  )
}

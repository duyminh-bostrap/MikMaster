import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function Panel({ title, aside, children, className, bodyClassName }: {
  title: string
  aside?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('overflow-hidden rounded-sm border border-border bg-card', className)}>
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-mono text-xs font-medium tracking-[0.08em] text-muted-foreground">{title}</h2>
        {aside}
      </header>
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  )
}

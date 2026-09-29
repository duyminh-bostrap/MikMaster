import type { ReactNode } from 'react'

export function AppFooter({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <footer className="flex shrink-0 items-center justify-between border-t border-border bg-muted px-5 py-2 font-mono text-xs text-muted-foreground">
      <span>{left}</span>
      <span className="flex items-center gap-1.5">{right}</span>
    </footer>
  )
}

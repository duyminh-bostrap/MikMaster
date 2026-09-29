import type { ReactNode } from 'react'

/** Khung chính của Dashboard: sidebar cố định bên trái, phần còn lại là cột nội dung cuộn riêng. */
export function AppShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}

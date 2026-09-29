export function UnavailableNotice({ children }: { children: string }) {
  return <p className="mb-3 rounded-sm border border-warn/25 bg-warn/[0.06] px-3 py-2 font-mono text-[10px] leading-snug text-warn">{children}</p>
}

import { EthernetPort } from 'lucide-react'
import { cn } from '@/utils/cn'

/** Icon kết nối mạng (cổng Ethernet): đang kết nối = xanh; mất kết nối = đỏ có gạch chéo. */
export function EthernetStatus({ lost, size = 14, label, className }: { lost: boolean; size?: number; label: string; className?: string }) {
  return (
    <span role="img" aria-label={label} title={label} data-connection={lost ? 'lost' : 'ok'} className={cn('relative inline-flex shrink-0', lost ? 'text-danger' : 'text-ok', className)} style={{ width: size, height: size }}>
      <EthernetPort size={size} strokeWidth={2.25} aria-hidden />
      {lost && <svg viewBox="0 0 24 24" width={size} height={size} className="absolute inset-0" aria-hidden><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" /></svg>}
    </span>
  )
}

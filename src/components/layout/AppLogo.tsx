import { Video } from 'lucide-react'
import { cn } from '@/utils/cn'

export function AppLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const box = { sm: 'size-5', md: 'size-6', lg: 'size-7' }[size]
  const icon = { sm: 11, md: 13, lg: 16 }[size]
  return (
    <div className="flex items-center gap-2">
      <div className={cn('flex shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground', box)}>
        <Video size={icon} strokeWidth={2.5} />
      </div>
      <span className={cn('font-semibold tracking-tight text-foreground', size === 'lg' ? 'text-base' : 'text-sm')}>MikMaster</span>
    </div>
  )
}

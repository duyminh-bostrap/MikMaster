import { useEdition } from '@/hooks/useEdition'
import { cn } from '@/utils/cn'

/** Logo MikMaster: chữ N gấp nếp + chấm (bản gốc nằm ở public/favicon.svg). */
export function LogoMark({ className }: { className?: string }) {
  return <img src="/favicon.svg" alt="" aria-hidden className={cn('shrink-0 object-contain', className)} />
}

/** Có license Pro → thêm nhãn PRO nổi bật màu cam sau tên. */
export function AppLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { pro } = useEdition()
  const box = { sm: 'size-5', md: 'size-6', lg: 'size-7' }[size]
  return (
    <div className="flex items-center gap-2">
      <LogoMark className={box} />
      <span className={cn('font-semibold tracking-tight text-foreground', size === 'lg' ? 'text-base' : 'text-sm')}>MikMaster</span>
      {pro && <span className={cn('rounded-sm bg-primary px-1 font-mono leading-4 font-bold tracking-[0.1em] text-primary-foreground', size === 'lg' ? 'text-[11px]' : 'text-[9px]')}>PRO</span>}
    </div>
  )
}

import { cn } from '@/utils/cn'

/**
 * Khung chữ thay cho ảnh khi máy không cho xem trước (vd. "HDCP-protected content" — cùng dòng chữ với trang Remote preview của máy).
 * `lg` cho trang máy, `sm` cho thẻ trên Dashboard.
 */
export function PreviewNotice({ size, children }: { size: 'sm' | 'lg'; children: React.ReactNode }) {
  const lg = size === 'lg'
  return (
    <div role="status" className={cn('relative overflow-hidden bg-black text-center text-white', lg ? 'aspect-video rounded-sm border-2 border-ok/70' : 'h-[90px] border-b border-border')}>
      <span className={cn('absolute inset-x-0 px-2 font-sans', lg ? 'top-4 text-base' : 'top-1/2 -translate-y-1/2 text-xs')}>{children}</span>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'

/** Double-click để sửa tại chỗ: Enter / bấm ra ngoài = lưu, Esc = huỷ. Rỗng thì giữ tên cũ. */
export function InlineEdit({ value, onSave, className, inputClassName, label, editRequest = 0 }: {
  value: string
  onSave: (next: string) => void
  className?: string
  inputClassName?: string
  label: string
  /** Tăng số này để mở ô sửa từ bên ngoài (ví dụ menu chuột phải → Rename). */
  editRequest?: number
}) {
  const [draft, setDraft] = useState<string | null>(null)
  // Esc rồi ô nhập bị gỡ có thể vẫn phát blur → không được lưu lại bản nháp đã huỷ.
  const cancelled = useRef(false)
  useEffect(() => {
    if (editRequest > 0) { cancelled.current = false; setDraft(value) }
    // Chỉ phản ứng khi có yêu cầu mới, không phải khi tên đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRequest])

  function commit() {
    if (draft === null || cancelled.current) return
    const next = draft.trim()
    if (next && next !== value) onSave(next)
    setDraft(null)
  }

  if (draft !== null) {
    return (
      <input
        autoFocus
        aria-label={label}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onFocus={e => e.target.select()}
        onBlur={commit}
        onClick={e => e.stopPropagation()}
        onDoubleClick={e => e.stopPropagation()}
        onKeyDown={e => {
          e.stopPropagation()
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { cancelled.current = true; setDraft(null) }
        }}
        className={cn('w-full min-w-0 rounded-sm border border-primary/60 bg-muted px-1 outline-none', className, inputClassName)}
      />
    )
  }

  return (
    <span
      title="Double-click to rename"
      onDoubleClick={e => { e.stopPropagation(); cancelled.current = false; setDraft(value) }}
      className={cn('cursor-text', className)}
    >
      {value}
    </span>
  )
}

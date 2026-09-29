import { useEffect } from 'react'
import { useIsDirty } from './hooks'

/** Trình duyệt hỏi xác nhận khi đóng tab / tải lại trang lúc project còn thay đổi chưa lưu. */
export function UnloadGuard() {
  const dirty = useIsDirty()
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  return null
}

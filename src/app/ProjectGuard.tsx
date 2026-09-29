import { Navigate, Outlet } from 'react-router'
import { useProjectState } from '@/store/hooks'

/** Chặn truy cập /project khi chưa mở project (ví dụ tải lại trang) → về màn hình Start. */
export function ProjectGuard() {
  const { project } = useProjectState()
  return project ? <Outlet /> : <Navigate to="/" replace />
}

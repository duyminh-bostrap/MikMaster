import { useSyncExternalStore } from 'react'
import type { LicenseStatusDto } from '../../shared/api.ts'
import type { Gateway } from './gateway'

/** Trạng thái bản quyền đọc từ gateway, dùng chung cho Cài đặt, huy hiệu ở chân trang và màn hình đăng nhập. */
let status: LicenseStatusDto | null = null
let loadedFor: Gateway | null = null
let timer: ReturnType<typeof setInterval> | undefined
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())
const POLL_MS = 60_000

export function setLicenseStatus(s: LicenseStatusDto | null): void { status = s; emit() }

export async function refreshLicense(gateway: Gateway): Promise<void> {
  const r = await gateway.getLicense()
  if (r.ok) setLicenseStatus(r.value)
}

/**
 * Tải lần đầu rồi cập nhật mỗi phút và khi cửa sổ được chọn lại: trạng thái đổi ở gateway mà người dùng không thao tác
 * (hết dùng thử, quá 30 ngày chưa xác minh, khoá bị thu hồi…) thì màn hình đăng nhập vẫn hiện đúng lúc.
 */
function start(gateway: Gateway): void {
  loadedFor = gateway
  clearInterval(timer)
  void refreshLicense(gateway)
  timer = setInterval(() => void refreshLicense(gateway), POLL_MS)
  if (typeof window !== 'undefined') window.addEventListener('focus', () => { if (loadedFor === gateway) void refreshLicense(gateway) })
}

export function useLicense(gateway: Gateway | null): LicenseStatusDto | null {
  if (!gateway) { if (status) status = null }
  else if (loadedFor !== gateway) start(gateway)
  return useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => status)
}

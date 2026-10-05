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

/*
 * Trang license: tự hiện khi mở app ở bản Free (bỏ qua được bằng "dùng bản Free", nhớ trong phiên làm việc) và mở lại được
 * bất cứ lúc nào (nút UNLOCK PRO, huy hiệu ở chân trang).
 */
const DISMISS_KEY = 'mikmaster.free-dismissed'
let pageOpen = false
let dismissed = (() => { try { return sessionStorage.getItem(DISMISS_KEY) === '1' } catch { return false } })()
const pageListeners = new Set<() => void>()
const emitPage = () => pageListeners.forEach(l => l())

export function openLicensePage(): void { pageOpen = true; emitPage() }
export function closeLicensePage(): void {
  pageOpen = false; dismissed = true
  try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* chỉ giữ trong bộ nhớ */ }
  emitPage()
}
/** Trang license đang được yêu cầu (người dùng mở, hoặc chưa bỏ qua ở bản Free). */
export const useLicensePageWanted = (): boolean => useSyncExternalStore(cb => { pageListeners.add(cb); return () => { pageListeners.delete(cb) } }, () => pageOpen || !dismissed)

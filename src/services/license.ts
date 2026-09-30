import { useSyncExternalStore } from 'react'
import type { LicenseStatusDto } from '../../shared/api.ts'
import type { Gateway } from './gateway'

/** Trạng thái bản quyền đọc từ gateway, dùng chung cho Cài đặt và huy hiệu ở chân trang. */
let status: LicenseStatusDto | null = null
let loadedFor: Gateway | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

export function setLicenseStatus(s: LicenseStatusDto | null): void { status = s; emit() }

export async function refreshLicense(gateway: Gateway): Promise<void> {
  const r = await gateway.getLicense()
  if (r.ok) setLicenseStatus(r.value)
}

export function useLicense(gateway: Gateway | null): LicenseStatusDto | null {
  if (!gateway) { if (status) status = null }
  else if (loadedFor !== gateway) { loadedFor = gateway; void refreshLicense(gateway) }
  return useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => status)
}

import { useSyncExternalStore } from 'react'
import type { QuickLoginsDto } from '../../shared/api.ts'
import type { Gateway } from './gateway'

/**
 * Tài khoản đăng nhập nhanh theo hãng, đọc một lần từ gateway rồi dùng chung cho mọi thẻ máy / trang máy
 * (để mỗi thẻ không tự gọi gateway). `refreshQuickLogins` sau khi lưu tài khoản mới.
 */
let logins: QuickLoginsDto = {}
let loadedFor: Gateway | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

export async function refreshQuickLogins(gateway: Gateway): Promise<void> {
  const r = await gateway.getQuickLogins()
  if (r.ok) { logins = r.value; emit() }
}

export function useQuickLogins(gateway: Gateway | null): QuickLoginsDto {
  if (gateway && loadedFor !== gateway) { loadedFor = gateway; void refreshQuickLogins(gateway) }
  return useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => logins)
}

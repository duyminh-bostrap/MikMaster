import { useSyncExternalStore } from 'react'
import type { CommandOverridesDto } from '../../shared/api.ts'
import type { Gateway } from './gateway'

/**
 * Lệnh sửa ở trang Nâng cao (theo hãng), đọc một lần từ gateway rồi dùng chung: giao diện dùng nó để biết máy nào đã có lệnh
 * (vd. test pattern của Panasonic khai báo ở trang Nâng cao) — gateway mới là nơi áp lệnh khi gửi.
 */
let overrides: CommandOverridesDto = {}
let loadedFor: Gateway | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

export const getCommandOverrides = (): CommandOverridesDto => overrides

export function setCommandOverrides(o: CommandOverridesDto): void { overrides = o; emit() }

export async function refreshCommandOverrides(gateway: Gateway): Promise<void> {
  const r = await gateway.getCommandOverrides()
  if (r.ok) setCommandOverrides(r.value)
}

/** Gọi trong component cần render lại khi lệnh sửa đổi (và để tải lần đầu). */
export function useCommandOverrides(gateway: Gateway | null): CommandOverridesDto {
  if (gateway && loadedFor !== gateway) { loadedFor = gateway; void refreshCommandOverrides(gateway) }
  return useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => overrides)
}

import { useEffect, useState } from 'react'
import type { IdentifyDto } from '../../../shared/api.ts'
import { getSharedCredentials } from '@/services/credentialCache'
import { useGateway } from '@/store/useGateway'
import { isValidIPv4 } from '@/utils/network'

export type IdentifyState =
  | { status: 'idle' }
  | { status: 'unavailable' }
  | { status: 'checking' }
  | { status: 'found'; result: IdentifyDto }
  | { status: 'none' }
  | { status: 'error'; message: string }

/** Nhập IP xong (dừng gõ 0,5 s) → hỏi gateway máy ở IP đó là gì. Dùng tài khoản đã đăng nhập trong phiên (đọc được model ở máy có mật khẩu). */
export function useIdentify(ip: string, enabled = true): IdentifyState {
  const { gateway } = useGateway()
  const [state, setState] = useState<IdentifyState>({ status: 'idle' })
  const clean = ip.trim()

  useEffect(() => {
    if (!enabled || !isValidIPv4(clean)) { setState({ status: 'idle' }); return }
    if (!gateway) { setState({ status: 'unavailable' }); return }
    let cancelled = false
    const timer = setTimeout(async () => {
      setState({ status: 'checking' })
      const r = await gateway.identify(clean, getSharedCredentials() ?? undefined)
      if (cancelled) return
      if (!r.ok) setState({ status: 'error', message: r.message })
      else setState(r.value.found ? { status: 'found', result: r.value } : { status: 'none' })
    }, 500)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [clean, enabled, gateway])

  return state
}

/** "Panasonic PT-RQ35K" — tránh lặp hãng khi model đã có tên hãng. */
export function modelLabel(r: IdentifyDto): string {
  const model = r.model?.trim() ?? ''
  const maker = r.manufacturer?.trim() ?? ''
  if (!model) return maker
  return maker && !model.toLowerCase().startsWith(maker.toLowerCase()) ? `${maker} ${model}` : model
}

/** Tên theo model; trùng tên đã có thì thêm số: "PT-RQ35K", "PT-RQ35K 2"… */
export function suggestName(r: IdentifyDto, taken: readonly string[]): string {
  const base = r.model?.trim() || r.name?.trim() || r.manufacturer?.trim() || 'Projector'
  const used = new Set(taken.map(n => n.trim().toLowerCase()))
  if (!used.has(base.toLowerCase())) return base
  let n = 2
  while (used.has(`${base} ${n}`.toLowerCase())) n++
  return `${base} ${n}`
}

import type { QuickLoginBrand } from '../../shared/api.ts'
import type { Projector } from '@/types'

export const BRAND_LABEL: Record<QuickLoginBrand, string> = { panasonic: 'Panasonic', christie: 'Christie', barco: 'Barco' }

/** Hãng của máy để chọn tài khoản đăng nhập nhanh: theo giao thức riêng của hãng, không thì theo tên model. */
export function brandOf(p: Projector): QuickLoginBrand | null {
  const type = p.network.protocol.type
  if (type === 'panasonic-nt-control') return 'panasonic'
  if (type === 'christie-serial-ip') return 'christie'
  if (type === 'barco-pulse') return 'barco'
  const model = p.model ?? ''
  if (/panasonic|\bPT-/i.test(model)) return 'panasonic'
  if (/christie|griffyn/i.test(model)) return 'christie'
  if (/barco|udx/i.test(model)) return 'barco'
  return null
}

import type { ProtocolType } from '@/types'

/** Dòng máy mà app nhắm tới; chọn preset sẽ điền sẵn giao thức + cổng. */
export interface ModelPreset {
  id: string
  label: string
  protocol: ProtocolType
}

export const MODEL_PRESETS: readonly ModelPreset[] = [
  // Panasonic khuyên dùng PJLink để giao tiếp với RQ35K (xác nhận với hãng, 2026-09).
  { id: 'pt-rq35k', label: 'Panasonic PT-RQ35K', protocol: 'pjlink-class2' },
  { id: 'griffyn-4k32', label: 'Christie Griffyn 4K32-RGB', protocol: 'christie-serial-ip' },
  { id: 'griffyn-4k50', label: 'Christie Griffyn 4K50-RGB', protocol: 'christie-serial-ip' },
  { id: 'barco-udx', label: 'Barco UDX (Pulse)', protocol: 'barco-pulse' },
]

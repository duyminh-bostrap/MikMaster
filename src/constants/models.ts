import type { ProtocolType } from '@/types'

/** Dòng máy mà app nhắm tới; chọn preset sẽ điền sẵn giao thức + cổng. */
export interface ModelPreset {
  id: string
  label: string
  protocol: ProtocolType
}

export const MODEL_PRESETS: readonly ModelPreset[] = [
  { id: 'pt-rq35k', label: 'Panasonic PT-RQ35K', protocol: 'panasonic-nt-control' },
  { id: 'griffyn-4k32', label: 'Christie Griffyn 4K32-RGB', protocol: 'christie-serial-ip' },
]

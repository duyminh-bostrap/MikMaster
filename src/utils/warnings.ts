import type { Projector } from '@/types'
import { TEMP_DANGER, TEMP_WARN } from '@/utils/tones'

export type WarningKind = 'hot' | 'warm' | 'error'
export interface Warning { projector: Projector; kind: WarningKind; text: string; /** nhiệt độ liên quan (kind hot / warm) */ tempC?: number }

/** Mọi cảnh báo đang có: lỗi máy báo, nhiệt độ > 40°C (nguy hiểm), nhiệt độ > 33°C (cảnh báo). Nguy hiểm trước. */
export function collectWarnings(ps: Projector[]): Warning[] {
  const out: Warning[] = []
  for (const projector of ps) {
    const c = projector.telemetry.temperatureC
    if (projector.connection === 'connected' && c > TEMP_DANGER) out.push({ projector, kind: 'hot', text: `${c}°C`, tempC: c })
    else if (projector.connection === 'connected' && c > TEMP_WARN) out.push({ projector, kind: 'warm', text: `${c}°C`, tempC: c })
    for (const e of projector.errors) out.push({ projector, kind: 'error', text: e })
  }
  const rank = { hot: 0, error: 1, warm: 2 } as const
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || (b.tempC ?? 0) - (a.tempC ?? 0))
}

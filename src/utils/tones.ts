export type Tone = 'ok' | 'warn' | 'danger' | 'accent' | 'off'

/** Map literal đầy đủ để Tailwind quét được class. */
export const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
  accent: 'text-accent',
  off: 'text-muted-foreground',
}

export const TONE_BG: Record<Tone, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger',
  accent: 'bg-accent',
  off: 'bg-off',
}

/** Thang nhiệt độ của app: dải hiển thị 20–45°C; trên 33°C cảnh báo, trên 40°C nguy hiểm. */
export const TEMP_RANGE = { min: 20, max: 45 } as const
export const TEMP_WARN = 33
export const TEMP_DANGER = 40

export function temperatureTone(tempC: number): Tone {
  if (tempC > TEMP_DANGER) return 'danger'
  if (tempC > TEMP_WARN) return 'warn'
  return 'ok'
}

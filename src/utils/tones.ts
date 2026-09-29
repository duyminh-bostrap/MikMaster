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

export function temperatureTone(tempC: number): Tone {
  if (tempC > 70) return 'danger'
  if (tempC > 55) return 'warn'
  return 'ok'
}

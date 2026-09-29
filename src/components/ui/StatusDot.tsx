import { cn } from '@/utils/cn'
import { TONE_BG, type Tone } from '@/utils/tones'
import type { PowerState } from '@/types'

const POWER_TONE: Record<PowerState, Tone> = { on: 'ok', standby: 'warn', off: 'off' }

export function StatusDot({ tone, pulse = false, className }: { tone: Tone; pulse?: boolean; className?: string }) {
  return <span className={cn('inline-block size-2 shrink-0 rounded-full', TONE_BG[tone], pulse && 'animate-status', className)} />
}

export function PowerDot({ power, className }: { power: PowerState; className?: string }) {
  return <StatusDot tone={POWER_TONE[power]} pulse={power === 'on'} className={className} />
}

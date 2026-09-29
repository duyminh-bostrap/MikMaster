import type { CSSProperties } from 'react'
import type { TestPatternType } from '@/types'

const LINE = 'rgb(255 255 255 / 0.55)'
const BARS = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0']

const PATTERN_STYLE: Record<TestPatternType, CSSProperties> = {
  grid: {
    backgroundColor: '#000',
    backgroundImage: `linear-gradient(${LINE} 1px, transparent 1px), linear-gradient(90deg, ${LINE} 1px, transparent 1px)`,
    backgroundSize: '6.25% 11.111%',
  },
  crosshatch: {
    backgroundColor: '#000',
    backgroundImage: `linear-gradient(${LINE} 1px, transparent 1px), linear-gradient(90deg, ${LINE} 1px, transparent 1px)`,
    backgroundSize: '3.125% 5.555%',
  },
  crosshair: {
    backgroundColor: '#000',
    backgroundImage: `linear-gradient(90deg, transparent calc(50% - 1px), ${LINE} calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)), linear-gradient(transparent calc(50% - 1px), ${LINE} calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)), repeating-radial-gradient(circle at center, transparent 0 18%, ${LINE} 18% calc(18% + 1px))`,
  },
  'color-bars': {
    backgroundImage: `linear-gradient(90deg, ${BARS.map((c, i) => `${c} ${(i / 7) * 100}% ${((i + 1) / 7) * 100}%`).join(', ')})`,
  },
  'gray-ramp': { backgroundImage: 'linear-gradient(90deg, #000, #fff)' },
  focus: {
    backgroundColor: '#000',
    backgroundImage: 'repeating-radial-gradient(circle at center, #fff 0 1px, #000 1px 7px)',
  },
  white: { backgroundColor: '#fff' },
  black: { backgroundColor: '#000' },
  red: { backgroundColor: '#f00' },
  green: { backgroundColor: '#0f0' },
  blue: { backgroundColor: '#00f' },
}

export function TestPatternOverlay({ type, testId }: { type: TestPatternType; testId?: string }) {
  return <div className="absolute inset-0" style={PATTERN_STYLE[type]} data-testid={testId} />
}

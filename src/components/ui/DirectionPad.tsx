import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type Direction = 'up' | 'down' | 'left' | 'right'

const ICON = { up: ChevronUp, down: ChevronDown, left: ChevronLeft, right: ChevronRight } as const
const CELL: Record<Direction, string> = {
  up: 'col-start-2 row-start-1',
  left: 'col-start-1 row-start-2',
  right: 'col-start-3 row-start-2',
  down: 'col-start-2 row-start-3',
}
const LABEL: Record<Direction, string> = { up: 'Up', down: 'Down', left: 'Left', right: 'Right' }

/**
 * Bàn phím 4 hướng dùng cho cả OSD (giữa là nút ENT) và Lens Shift (giữa là điểm tĩnh).
 * `center` là ReactNode tĩnh; truyền `onCenter` để biến nó thành nút bấm.
 */
export function DirectionPad({ onPress, center, onCenter, disabled = false, label }: {
  onPress: (direction: Direction) => void
  center?: ReactNode
  onCenter?: () => void
  disabled?: boolean
  label: string
}) {
  const cell = 'flex size-11 items-center justify-center rounded-sm border border-border transition-colors'
  return (
    <div role="group" aria-label={label} className="grid grid-cols-[repeat(3,2.75rem)] grid-rows-[repeat(3,2.75rem)] gap-1">
      {(Object.keys(ICON) as Direction[]).map(dir => {
        const Icon = ICON[dir]
        return (
          <button
            key={dir}
            type="button"
            aria-label={LABEL[dir]}
            disabled={disabled}
            onClick={() => onPress(dir)}
            className={cn(cell, CELL[dir], 'bg-elevated text-foreground hover:bg-elevated-hover active:scale-95 active:bg-secondary disabled:cursor-not-allowed disabled:opacity-40')}
          >
            <Icon size={14} strokeWidth={2.5} />
          </button>
        )
      })}
      {onCenter ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onCenter}
          className={cn(cell, 'col-start-2 row-start-2 bg-elevated font-mono text-[9px] text-primary hover:bg-elevated-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-40')}
        >
          {center}
        </button>
      ) : (
        <div className={cn(cell, 'col-start-2 row-start-2 bg-inset')}>{center}</div>
      )}
    </div>
  )
}

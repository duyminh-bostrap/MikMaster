import { Button } from '@/components/ui/Button'
import { useProjectActions } from '@/store/hooks'

/** Điều khiển nhanh cho một nhóm máy (toàn bộ hoặc theo Booth). */
export function QuickControls({ projectorIds, variant = 'full' }: { projectorIds: string[]; variant?: 'full' | 'compact' }) {
  const { setPower, setShutter } = useProjectActions()
  const disabled = projectorIds.length === 0

  if (variant === 'compact') {
    return (
      <div className="flex gap-1">
        <Button size="xs" variant="ok" disabled={disabled} onClick={() => setPower(projectorIds, 'on')}>ALL ON</Button>
        <Button size="xs" variant="secondary" disabled={disabled} onClick={() => setPower(projectorIds, 'standby')}>ALL OFF</Button>
        <Button size="xs" variant="warn" disabled={disabled} onClick={() => setShutter(projectorIds, true)}>SHUTTER</Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ok" disabled={disabled} onClick={() => setPower(projectorIds, 'on')}>ALL ON</Button>
      <Button variant="secondary" disabled={disabled} onClick={() => setPower(projectorIds, 'standby')}>ALL OFF</Button>
      <div className="h-4 w-px bg-border" />
      <Button variant="warn" disabled={disabled} onClick={() => setShutter(projectorIds, true)}>SHUTTER ALL</Button>
      <Button variant="secondary" disabled={disabled} onClick={() => setShutter(projectorIds, false)}>UNSHUTTER</Button>
    </div>
  )
}

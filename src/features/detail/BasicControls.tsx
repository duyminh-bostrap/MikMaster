import { Ban, Power } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { INPUT_SOURCES } from '@/constants/inputs'
import { useProjectActions } from '@/store/hooks'
import type { Projector } from '@/types'

/** Power · Shutter · Input source. */
export function BasicControls({ projector: p, inputEnabled }: { projector: Projector; inputEnabled: boolean }) {
  const { setPower, setShutter, setInput } = useProjectActions()

  return (
    <>
      <SectionHeader label="POWER" />
      <div className="mb-5 flex gap-2">
        <Button size="md" variant="ok" selected={p.power === 'on'} className="flex-1" onClick={() => setPower([p.id], 'on')}>
          <Power size={12} strokeWidth={2.5} />ON
        </Button>
        <Button size="md" variant="warn" selected={p.power === 'standby' || p.power === 'off'} className="flex-1" onClick={() => setPower([p.id], 'standby')}>
          OFF
        </Button>
      </div>

      <SectionHeader label="SHUTTER / BLANK" />
      <Button size="md" variant="warn" selected={p.shutter} className="mb-5 w-full tracking-[0.06em]" onClick={() => setShutter([p.id], !p.shutter)}>
        <Ban size={13} />
        {p.shutter ? 'SHUTTER CLOSED' : 'SHUTTER OPEN'}
      </Button>

      <SectionHeader label="INPUT SOURCE" />
      <div className="mb-5 flex flex-wrap gap-1.5">
        {INPUT_SOURCES.map(source => (
          <Button key={source} variant="accent" selected={p.input === source} disabled={!inputEnabled} className="px-2.5" onClick={() => setInput(p.id, source)}>
            {source}
          </Button>
        ))}
      </div>
    </>
  )
}

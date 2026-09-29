import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DirectionPad, type Direction } from '@/components/ui/DirectionPad'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useProjectActions } from '@/store/hooks'
import type { OsdKey, Projector } from '@/types'

/** OSD chỉ khả dụng khi máy đang bật (menu chỉ hiện khi có hình). Phím được gửi qua gateway nếu có. */
export function OsdPanel({ projector }: { projector: Projector }) {
  const [lastSent, setLastSent] = useState<OsdKey | null>(null)
  const disabled = projector.power !== 'on'
  const { sendOsd } = useProjectActions()
  const send = (key: OsdKey) => { setLastSent(key); sendOsd(projector.id, key) }

  const sideButton = (key: OsdKey, label: string, main = false) => (
    <Button variant="secondary" disabled={disabled} className={main ? 'w-20 py-2 tracking-[0.06em]' : 'w-20 py-1.5 text-muted-foreground'} onClick={() => send(key)}>
      {label}
    </Button>
  )

  return (
    <div>
      <SectionHeader label="OSD NAVIGATION" />
      <div className="flex items-start justify-center gap-8">
        <div className="flex flex-col gap-2">
          {sideButton('menu', 'MENU', true)}
          <div className="flex flex-col gap-1.5">
            {sideButton('back', 'BACK')}
            {sideButton('exit', 'EXIT')}
          </div>
        </div>
        <DirectionPad label="OSD navigation" disabled={disabled} center="ENT" onCenter={() => send('enter')} onPress={(d: Direction) => send(d)} />
      </div>
      <p className="mt-3 text-center font-mono text-[10px] text-muted-foreground" aria-live="polite">
        {disabled ? 'Power on the projector to use OSD' : lastSent ? `→ ${lastSent.toUpperCase()} sent` : 'Ready'}
      </p>
    </div>
  )
}

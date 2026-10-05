import { Button } from '@/components/ui/Button'
import { DirectionPad } from '@/components/ui/DirectionPad'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { LENS_STEP } from '@/constants/lens'
import { formatSigned } from '@/utils/format'
import { useProjectActions } from '@/store/hooks'
import type { Projector } from '@/types'
import { LensAxisControl } from './LensAxisControl'
import { LensPresetSection } from './LensPresetSection'
import { t } from '@/i18n'

/** Cột phải của trang Detail: Lens Shift / Zoom / Focus + Presets. */
export function LensPanel({ projector: p }: { projector: Projector }) {
  const { adjustLens, resetLensShift } = useProjectActions()
  const { shiftX, shiftY, zoom, focus } = p.lens.position

  return (
    <>
      <SectionHeader label={t('LENS SHIFT')} />
      <div className="mb-4 flex items-center justify-between">
        <DirectionPad
          label={t('Lens shift')}
          center={<span className="size-2 rounded-full bg-border" />}
          onPress={dir => {
            if (dir === 'up') adjustLens(p.id, { shiftY: LENS_STEP })
            if (dir === 'down') adjustLens(p.id, { shiftY: -LENS_STEP })
            if (dir === 'left') adjustLens(p.id, { shiftX: -LENS_STEP })
            if (dir === 'right') adjustLens(p.id, { shiftX: LENS_STEP })
          }}
        />
        <div className="ml-3 flex flex-col gap-1.5 font-mono text-xs">
          <div className="flex justify-between gap-4"><span className="text-[10px] text-muted-foreground">H</span><span className="tabular-nums">{formatSigned(shiftX)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-[10px] text-muted-foreground">V</span><span className="tabular-nums">{formatSigned(shiftY)}</span></div>
          <Button size="xs" className="text-muted-foreground" onClick={() => resetLensShift(p.id)}>{t('RESET')}</Button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4">
        <LensAxisControl label={t('ZOOM')} value={zoom} decLabel="−" incLabel="+" tone="accent" onDec={() => adjustLens(p.id, { zoom: -LENS_STEP })} onInc={() => adjustLens(p.id, { zoom: LENS_STEP })} />
        <LensAxisControl label={t('FOCUS')} value={focus} decLabel="NEAR" incLabel="FAR" tone="warn" onDec={() => adjustLens(p.id, { focus: -LENS_STEP })} onInc={() => adjustLens(p.id, { focus: LENS_STEP })} />
      </div>

      <LensPresetSection projector={p} />
    </>
  )
}

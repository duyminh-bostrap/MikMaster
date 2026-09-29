import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { LENS_SLOTS } from '@/constants/lens'
import { useProjectActions } from '@/store/hooks'
import type { LensSlot, Projector } from '@/types'
import { PresetSlotCard } from './PresetSlotCard'

/** 4 slot Lens Preset: Save (kèm đặt tên), Load, Unload. */
export function LensPresetSection({ projector: p }: { projector: Projector }) {
  const { saveLensPreset, loadLensPreset, unloadLensPreset } = useProjectActions()
  const [savingSlot, setSavingSlot] = useState<LensSlot | null>(null)
  const [name, setName] = useState('')

  function beginSave(slot: LensSlot) {
    setName(p.lens.presets[slot - 1]?.name ?? `Preset ${slot}`)
    setSavingSlot(slot)
  }

  function commitSave() {
    if (savingSlot === null || !name.trim()) return
    saveLensPreset(p.id, savingSlot, name.trim())
    setSavingSlot(null)
  }

  return (
    <>
      <SectionHeader label="LENS PRESETS" />

      {savingSlot !== null && (
        <div className="mb-3 rounded-sm border border-primary/25 bg-primary/[0.06] p-3">
          <p className="mb-2 font-mono text-xs text-primary">SAVE TO SLOT {savingSlot}</p>
          <TextInput
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Preset name…"
            aria-label="Preset name"
            className="mb-2 px-2 py-1.5 text-xs"
            onKeyDown={e => {
              if (e.key === 'Enter') commitSave()
              if (e.key === 'Escape') setSavingSlot(null)
            }}
          />
          <div className="flex gap-1">
            <Button variant="primary" className="flex-1" disabled={!name.trim()} onClick={commitSave}>SAVE</Button>
            <Button onClick={() => setSavingSlot(null)}>CANCEL</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {LENS_SLOTS.map(slot => (
          <PresetSlotCard
            key={slot}
            slot={slot}
            preset={p.lens.presets[slot - 1] ?? null}
            isActive={p.lens.activePreset === slot}
            onSave={() => beginSave(slot)}
            onLoad={() => loadLensPreset(p.id, slot)}
            onUnload={() => unloadLensPreset(p.id)}
          />
        ))}
      </div>
    </>
  )
}

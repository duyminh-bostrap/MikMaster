import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, SelectInput, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useOpenProject, useProjectActions } from '@/store/hooks'

export type EditTarget =
  | { kind: 'booth'; id: string | null }
  | { kind: 'projector'; id: string }

/** Một điểm vào cho mọi hộp thoại chỉnh sửa trên Dashboard. */
export function EditDialog({ target, onClose }: { target: EditTarget; onClose: () => void }) {
  if (target.kind === 'booth') return <BoothDialog id={target.id} onClose={onClose} />
  return <ProjectorDialog id={target.id} onClose={onClose} />
}

function Actions({ canSave, onClose, left }: { canSave: boolean; onClose: () => void; left?: React.ReactNode }) {
  return (
    <>
      {left}
      <div className="ml-auto flex gap-2">
        <Button onClick={onClose}>CANCEL</Button>
        <Button type="submit" variant="primary" disabled={!canSave}>SAVE</Button>
      </div>
    </>
  )
}

function BoothDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { booths, projectors } = useOpenProject()
  const { addBooth, updateBooth, removeBooth } = useProjectActions()
  const booth = id ? booths.find(b => b.id === id) : undefined
  const [name, setName] = useState(booth?.name ?? '')
  const [location, setLocation] = useState(booth?.location ?? '')
  const others = booths.filter(b => b.id !== id)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? '')
  const inBooth = projectors.filter(p => p.boothId === id).length
  const duplicate = others.some(b => b.name.trim().toLowerCase() === name.trim().toLowerCase())
  const valid = name.trim() !== '' && !duplicate

  function save() {
    if (!valid) return
    if (booth) updateBooth(booth.id, { name: name.trim(), location: location.trim() })
    else addBooth(name.trim(), location.trim())
    onClose()
  }

  const deleteControls = booth && (
    others.length === 0
      ? <span className="font-mono text-[10px] text-muted-foreground">The last booth cannot be deleted.</span>
      : confirmDelete
        ? <Button variant="danger" onClick={() => { removeBooth(booth.id, moveTo); onClose() }}><Trash2 size={11} />CONFIRM DELETE</Button>
        : <Button variant="danger" onClick={() => setConfirmDelete(true)}><Trash2 size={11} />DELETE</Button>
  )

  return (
    <Modal title={booth ? 'EDIT BOOTH' : 'NEW BOOTH'} onClose={onClose} onSubmit={save} footer={<Actions canSave={valid} onClose={onClose} left={deleteControls} />}>
      <Field label="BOOTH NAME">{fid => <TextInput id={fid} value={name} invalid={name !== '' && !valid} placeholder="e.g. Main Stage" onChange={e => setName(e.target.value)} />}</Field>
      {duplicate && <p className="-mt-1 font-mono text-[10px] text-danger">A booth with this name already exists.</p>}
      <Field label="LOCATION (opt.)">{fid => <TextInput id={fid} value={location} placeholder="e.g. FOH Truss" onChange={e => setLocation(e.target.value)} />}</Field>
      {confirmDelete && (
        <div className="rounded-sm border border-danger/30 bg-danger/5 p-3">
          <p className="mb-2 font-mono text-[10px] leading-relaxed text-danger">
            Delete “{booth?.name}”?{inBooth > 0 ? ` Its ${inBooth} projector${inBooth > 1 ? 's' : ''} will move to:` : ' It has no projectors.'}
          </p>
          {inBooth > 0 && (
            <SelectInput aria-label="Move projectors to" value={moveTo} onChange={e => setMoveTo(e.target.value)} className="px-2 py-1.5 text-xs">
              {others.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </SelectInput>
          )}
        </div>
      )}
    </Modal>
  )
}

function ProjectorDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { booths, projectors } = useOpenProject()
  const { updateProjector, moveToBooth, removeProjector } = useProjectActions()
  const p = projectors.find(x => x.id === id)
  const [name, setName] = useState(p?.name ?? '')
  const [location, setLocation] = useState(p?.location ?? '')
  const [model, setModel] = useState(p?.model ?? '')
  const [boothId, setBoothId] = useState(p?.boothId ?? '')
  const [confirmRemove, setConfirmRemove] = useState(false)
  if (!p) return null
  const valid = name.trim() !== ''

  function save() {
    if (!valid || !p) return
    updateProjector(p.id, { name: name.trim(), location: location.trim(), model: model.trim() || 'Unknown' })
    const booth = booths.find(b => b.id === boothId)
    if (booth && booth.id !== p.boothId) moveToBooth([p.id], booth)
    onClose()
  }

  const removeControl = confirmRemove
    ? <Button variant="danger" onClick={() => { removeProjector(p.id); onClose() }}><Trash2 size={11} />CONFIRM REMOVE</Button>
    : <Button variant="danger" onClick={() => setConfirmRemove(true)}><Trash2 size={11} />REMOVE</Button>

  return (
    <Modal title={`EDIT ${p.id}`} onClose={onClose} onSubmit={save} footer={<Actions canSave={valid} onClose={onClose} left={removeControl} />}>
      <Field label="DISPLAY NAME">{fid => <TextInput id={fid} value={name} invalid={!valid} onChange={e => setName(e.target.value)} />}</Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="LOCATION">{fid => <TextInput id={fid} value={location} onChange={e => setLocation(e.target.value)} />}</Field>
        <Field label="BOOTH">
          {fid => (
            <SelectInput id={fid} value={boothId} onChange={e => setBoothId(e.target.value)}>
              {booths.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </SelectInput>
          )}
        </Field>
      </div>
      <Field label="MODEL">{fid => <TextInput id={fid} value={model} onChange={e => setModel(e.target.value)} />}</Field>
      <p className="font-mono text-[10px] text-muted-foreground">IP {p.network.ip} · IP, protocol and login are edited on the projector's control page.</p>
      {confirmRemove && <p className="font-mono text-[10px] text-danger">Remove {p.name} from this project? The projector itself is not changed.</p>}
    </Modal>
  )
}

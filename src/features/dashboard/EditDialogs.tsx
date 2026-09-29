import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, SelectInput, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useOpenProject, useProjectActions } from '@/store/hooks'

export type EditTarget =
  | { kind: 'deleteBooth'; id: string }
  | { kind: 'projector'; id: string }

/** Một điểm vào cho mọi hộp thoại chỉnh sửa trên Dashboard. */
export function EditDialog({ target, onClose }: { target: EditTarget; onClose: () => void }) {
  if (target.kind === 'deleteBooth') return <DeleteBoothDialog id={target.id} onClose={onClose} />
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

function DeleteBoothDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { booths, projectors } = useOpenProject()
  const { removeBooth } = useProjectActions()
  const booth = booths.find(b => b.id === id)
  const others = booths.filter(b => b.id !== id)
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? '')
  if (!booth || others.length === 0) return null
  const inBooth = projectors.filter(p => p.boothId === id).length
  const remove = () => { removeBooth(booth.id, moveTo); onClose() }

  return (
    <Modal title="DELETE BOOTH" onClose={onClose} onSubmit={remove}
      footer={<div className="ml-auto flex gap-2"><Button onClick={onClose}>CANCEL</Button><Button type="submit" variant="danger"><Trash2 size={11} />DELETE</Button></div>}>
      <p className="text-sm text-foreground">Delete “{booth.name}”?</p>
      {inBooth > 0 ? (
        <Field label={`MOVE ITS ${inBooth} PROJECTOR${inBooth > 1 ? 'S' : ''} TO`}>
          {fid => (
            <SelectInput id={fid} value={moveTo} onChange={e => setMoveTo(e.target.value)}>
              {others.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </SelectInput>
          )}
        </Field>
      ) : <p className="font-mono text-[10px] text-muted-foreground">It has no projectors.</p>}
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

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

/** Hỏi trước khi rời project có thay đổi chưa lưu: SAVE (rồi tiếp tục) · DON'T SAVE · CANCEL. */
export function UnsavedChangesDialog({ projectName, actionLabel, onSave, onDiscard, onCancel }: {
  projectName: string
  /** Việc sắp làm, ví dụ "opening another project". */
  actionLabel: string
  onSave: () => Promise<boolean>
  onDiscard: () => void
  onCancel: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  async function save() {
    if (saving) return
    setSaving(true)
    setFailed(false)
    const ok = await onSave().catch(() => false)
    setSaving(false)
    if (ok) onDiscard()
    else setFailed(true)
  }

  return (
    <Modal title="UNSAVED CHANGES" onClose={onCancel} onSubmit={() => void save()}
      footer={
        <>
          <Button variant="danger" onClick={onDiscard} disabled={saving}>DON'T SAVE</Button>
          <div className="ml-auto flex gap-2">
            <Button onClick={onCancel} disabled={saving}>CANCEL</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'SAVING…' : 'SAVE'}</Button>
          </div>
        </>
      }>
      <p className="text-sm text-foreground">Save changes to “{projectName}” before {actionLabel}?</p>
      <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">Changes to the project name, booths and projector settings will be lost if you don't save.</p>
      {failed && <p role="alert" className="font-mono text-[10px] text-danger">Could not save. Try again, or choose Don't save.</p>}
    </Modal>
  )
}

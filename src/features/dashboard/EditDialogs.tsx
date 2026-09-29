import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, SelectInput, TextInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { MODEL_PRESETS } from '@/constants/models'
import { PROTOCOL_OPTIONS, defaultProtocolConfig, getProtocolOption } from '@/constants/protocols'
import { useT } from '@/i18n'
import { getDeviceCredentials, getSharedCredentials } from '@/services/credentialCache'
import { useOpenProject, useProjectActions } from '@/store/hooks'
import { fillMissingCredentials, needsAuth } from '@/utils/credentials'
import { isValidIPv4 } from '@/utils/network'
import { appendLog, createProjector } from '@/utils/projector'
import { nextProjectorId } from '@/utils/projectorFilter'
import type { Projector, ProtocolType } from '@/types'

export type EditTarget =
  | { kind: 'deleteBooth'; id: string }
  | { kind: 'projector'; id: string }
  | { kind: 'addProjector'; boothId?: string }

/** Một điểm vào cho mọi hộp thoại chỉnh sửa trên Dashboard. */
export function EditDialog({ target, onClose }: { target: EditTarget; onClose: () => void }) {
  if (target.kind === 'deleteBooth') return <DeleteBoothDialog id={target.id} onClose={onClose} />
  if (target.kind === 'addProjector') return <ProjectorDialog boothId={target.boothId} onClose={onClose} />
  return <ProjectorDialog id={target.id} onClose={onClose} />
}

function DeleteBoothDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useT()
  const { booths, projectors } = useOpenProject()
  const { removeBooth } = useProjectActions()
  const booth = booths.find(b => b.id === id)
  const others = booths.filter(b => b.id !== id)
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? '')
  if (!booth || others.length === 0) return null
  const inBooth = projectors.filter(p => p.boothId === id).length
  const remove = () => { removeBooth(booth.id, moveTo); onClose() }

  return (
    <Modal title={t('DELETE BOOTH')} onClose={onClose} onSubmit={remove}
      footer={<div className="ml-auto flex gap-2"><Button onClick={onClose}>{t('CANCEL')}</Button><Button type="submit" variant="danger"><Trash2 size={11} />{t('DELETE')}</Button></div>}>
      <p className="text-sm text-foreground">{t('Delete "{name}"?', { name: booth.name })}</p>
      {inBooth > 0 ? (
        <Field label={t('MOVE ITS {n} PROJECTOR(S) TO', { n: inBooth })}>
          {fid => (
            <SelectInput id={fid} value={moveTo} onChange={e => setMoveTo(e.target.value)}>
              {others.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </SelectInput>
          )}
        </Field>
      ) : <p className="font-mono text-[10px] text-muted-foreground">{t('It has no projectors.')}</p>}
    </Modal>
  )
}

/**
 * Thêm (không có `id`) hoặc sửa một máy: tên, booth, model, IP, giao thức, cổng.
 * Đổi giao thức thì bỏ mẫu lệnh (cú pháp khác nhau) và tài khoản nếu giao thức mới không đăng nhập.
 */
function ProjectorDialog({ id, boothId: initialBooth, onClose }: { id?: string; boothId?: string; onClose: () => void }) {
  const t = useT()
  const { booths, projectors } = useOpenProject()
  const { updateProjector, moveToBooth, removeProjector, addProjector } = useProjectActions()
  const p = id ? projectors.find(x => x.id === id) : undefined
  const adding = !id
  const [name, setName] = useState(p?.name ?? '')
  const [model, setModel] = useState(p?.model ?? '')
  const [boothId, setBoothId] = useState(p?.boothId ?? initialBooth ?? booths[0]?.id ?? '')
  const [ip, setIp] = useState(p?.network.ip ?? '')
  const [type, setType] = useState<ProtocolType>(p?.network.protocol.type ?? 'pjlink-class2')
  const [port, setPort] = useState(String(p?.network.protocol.port ?? getProtocolOption('pjlink-class2').defaultPort))
  const [confirmRemove, setConfirmRemove] = useState(false)
  if (id && !p) return null

  const portNum = Number(port)
  const ipValid = isValidIPv4(ip.trim())
  const portValid = Number.isInteger(portNum) && portNum >= 1 && portNum <= 65535
  const duplicate = projectors.some(x => x.id !== id && x.network.ip === ip.trim() && x.network.protocol.port === portNum)
  const valid = ipValid && portValid && !duplicate && (adding || name.trim() !== '')

  function chooseModel(label: string) {
    setModel(label)
    const preset = MODEL_PRESETS.find(m => m.label === label)
    if (preset) changeType(preset.protocol)
  }
  function changeType(next: ProtocolType) {
    setType(next)
    setPort(String(defaultProtocolConfig(next).port))
  }

  function save() {
    if (!valid) return
    const cleanIp = ip.trim()
    if (adding) {
      const base = createProjector({
        id: nextProjectorId(projectors), boothId, ip: cleanIp, protocol: type,
        name: name.trim() || `Projector ${cleanIp}`, model: model.trim() || undefined,
      })
      const withPort = { ...base, network: { ...base.network, protocol: { ...base.network.protocol, port: portNum } } }
      // Máy mới cần đăng nhập: dùng tài khoản đã đăng nhập trong phiên này (nếu có).
      const [projector] = fillMissingCredentials([withPort], { device: getDeviceCredentials, shared: getSharedCredentials })
      addProjector({ ...projector!, log: appendLog(projector!, 'info', 'Added to the project') })
      onClose()
      return
    }
    const cur = p!
    const sameProtocol = type === cur.network.protocol.type
    const protocol: Projector['network']['protocol'] = {
      type, port: portNum,
      ...(needsAuth(type) ? { username: cur.network.protocol.username, password: cur.network.protocol.password } : {}),
      ...(sameProtocol && cur.network.protocol.commands ? { commands: cur.network.protocol.commands } : {}),
    }
    const networkChanged = cleanIp !== cur.network.ip || !sameProtocol || portNum !== cur.network.protocol.port
    updateProjector(cur.id, {
      name: name.trim(), model: model.trim() || 'Unknown',
      ...(networkChanged ? { network: { ip: cleanIp, protocol }, connection: 'connected' as const, log: appendLog(cur, 'info', `Network config applied: ${getProtocolOption(type).label} ${cleanIp}:${portNum}`) } : {}),
    })
    const booth = booths.find(b => b.id === boothId)
    if (booth && booth.id !== cur.boothId) moveToBooth([cur.id], booth)
    onClose()
  }

  const removeControl = !adding && (confirmRemove
    ? <Button variant="danger" onClick={() => { removeProjector(p!.id); onClose() }}><Trash2 size={11} />{t('CONFIRM REMOVE')}</Button>
    : <Button variant="danger" onClick={() => setConfirmRemove(true)}><Trash2 size={11} />{t('REMOVE')}</Button>)

  return (
    <Modal title={adding ? t('ADD PROJECTOR') : t('EDIT {id}', { id: p!.id })} onClose={onClose} onSubmit={save}
      footer={
        <>
          {removeControl}
          <div className="ml-auto flex gap-2">
            <Button onClick={onClose}>{t('CANCEL')}</Button>
            <Button type="submit" variant="primary" disabled={!valid}>{adding ? t('ADD') : t('SAVE')}</Button>
          </div>
        </>
      }>
      <div className="grid grid-cols-[1fr_90px] gap-2">
        <Field label={t('IP ADDRESS')}>{fid => <TextInput id={fid} value={ip} invalid={ip !== '' && (!ipValid || duplicate)} placeholder="192.168.1.100" onChange={e => setIp(e.target.value)} />}</Field>
        <Field label={t('PORT')}>{fid => <TextInput id={fid} value={port} invalid={!portValid} inputMode="numeric" onChange={e => setPort(e.target.value)} />}</Field>
      </div>
      {duplicate && <p className="-mt-1 font-mono text-[10px] text-danger">{t('Another projector already uses this IP and port.')}</p>}
      <Field label={t('PROTOCOL')}>
        {fid => (
          <SelectInput id={fid} value={type} onChange={e => changeType(e.target.value as ProtocolType)}>
            {PROTOCOL_OPTIONS.map(o => <option key={o.type} value={o.type}>{o.label}</option>)}
          </SelectInput>
        )}
      </Field>
      <Field label={adding ? t('DISPLAY NAME (opt.)') : t('DISPLAY NAME')}>
        {fid => <TextInput id={fid} value={name} invalid={!adding && name.trim() === ''} placeholder={adding ? `Projector ${ip || '…'}` : ''} onChange={e => setName(e.target.value)} />}
      </Field>
      <Field label={t('BOOTH')}>
        {fid => (
          <SelectInput id={fid} value={boothId} onChange={e => setBoothId(e.target.value)}>
            {booths.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </SelectInput>
        )}
      </Field>
      <Field label={t('MODEL')}>
        {fid => (
          <>
            <TextInput id={fid} value={model} list="mikmaster-models" placeholder={t('Panasonic PT-RQ35K')} onChange={e => chooseModel(e.target.value)} />
            <datalist id="mikmaster-models">{MODEL_PRESETS.map(m => <option key={m.id} value={m.label} />)}</datalist>
          </>
        )}
      </Field>
      {adding && needsAuth(type) && (
        <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">{t('If this projector has a password, you will be asked to sign in on its page.')}</p>
      )}
      {confirmRemove && <p className="font-mono text-[10px] text-danger">{t('Remove {name} from this project? The projector itself is not changed.', { name: p!.name })}</p>}
    </Modal>
  )
}

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, SelectInput, TextInput } from '@/components/ui/Field'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PROTOCOL_OPTIONS, defaultProtocolConfig, getProtocolOption } from '@/constants/protocols'
import { needsAuth } from '@/utils/credentials'
import { isValidIPv4 } from '@/utils/network'
import { appendLog } from '@/utils/projector'
import { useProjectActions } from '@/store/hooks'
import type { Projector, ProtocolType } from '@/types'

/** Chỉnh IP / Port / giao thức (tài khoản đăng nhập nằm ở AccountPanel). Chỉ áp dụng khi bấm APPLY để tránh gửi cấu hình dở dang. */
export function NetworkEditor({ projector: p }: { projector: Projector }) {
  const { updateProjector } = useProjectActions()
  const [ip, setIp] = useState(p.network.ip)
  const [type, setType] = useState<ProtocolType>(p.network.protocol.type)
  const [port, setPort] = useState(String(p.network.protocol.port))

  const portNum = Number(port)
  const portValid = Number.isInteger(portNum) && portNum >= 1 && portNum <= 65535
  const ipValid = isValidIPv4(ip)
  const dirty =
    ip !== p.network.ip || type !== p.network.protocol.type || portNum !== p.network.protocol.port

  function changeType(next: ProtocolType) {
    setType(next)
    setPort(String(defaultProtocolConfig(next).port))
  }

  function apply() {
    if (!ipValid || !portValid) return
    updateProjector(p.id, {
      network: { ip, protocol: { type, port: portNum, ...(needsAuth(type) ? { username: p.network.protocol.username, password: p.network.protocol.password } : {}) } },
      connection: 'connected',
      log: appendLog(p, 'info', `Network config applied: ${getProtocolOption(type).label} ${ip}:${portNum}`),
    })
  }

  return (
    <>
      <SectionHeader label="NETWORK / PROTOCOL" />
      <div className="mb-5 flex flex-col gap-2.5">
        <Field label="PROTOCOL">
          {id => (
            <SelectInput id={id} value={type} onChange={e => changeType(e.target.value as ProtocolType)} className="px-2 py-1.5 text-xs">
              {PROTOCOL_OPTIONS.map(o => <option key={o.type} value={o.type}>{o.label}</option>)}
            </SelectInput>
          )}
        </Field>
        <div className="grid grid-cols-[1fr_80px] gap-2">
          <Field label="IP ADDRESS">{id => <TextInput id={id} value={ip} invalid={!ipValid} onChange={e => setIp(e.target.value)} className="px-2 py-1.5 text-xs" />}</Field>
          <Field label="PORT">{id => <TextInput id={id} value={port} invalid={!portValid} inputMode="numeric" onChange={e => setPort(e.target.value)} className="px-2 py-1.5 text-xs" />}</Field>
        </div>
        <Button variant="primary" disabled={!dirty || !ipValid || !portValid} onClick={apply}>APPLY</Button>
      </div>
    </>
  )
}

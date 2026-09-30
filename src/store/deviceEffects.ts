import type { Dispatch } from 'react'
import { TEMPLATE_PROTOCOLS, type OsdKeyDto } from '../../shared/api.ts'
import type { Gateway } from '@/services/gateway'
import { deviceCapabilities } from '@/services/capabilities'
import type { InputSource, PowerState, Projector } from '@/types'
import type { ProjectAction } from './projectReducer'

/*
 * Lệnh gửi tới máy thật. UI cập nhật lạc quan (reducer đã đổi state); nếu lệnh thất bại, kết quả
 * được đẩy lại vào model (mất kết nối / lỗi giao thức / log) chứ không im lặng.
 */

const HOLD_MS = 2500
const busyUntil = new Map<string, number>()

/** Vòng poll bỏ qua máy vừa nhận lệnh để trạng thái cũ không ghi đè thay đổi người dùng vừa làm. */
export function isBusy(id: string): boolean {
  return (busyUntil.get(id) ?? 0) > Date.now()
}

export interface DeviceEffects {
  power(ids: string[], power: PowerState): void
  shutter(ids: string[], closed: boolean): void
  input(id: string, input: InputSource): void
  osd(id: string, key: OsdKeyDto): void
  /** `enabled` bỏ trống = chỉ đổi loại mẫu: gửi lại nếu máy đang hiện test pattern. */
  testPattern(ids: string[], enabled: boolean | undefined, pattern?: string): void
  osdDisplay(ids: string[], visible: boolean): void
}

export function createDeviceEffects(gateway: Gateway, find: (id: string) => Projector | undefined, dispatch: Dispatch<ProjectAction>): DeviceEffects {
  async function run(id: string, capability: 'power' | 'shutter' | 'input' | 'osd' | 'osdDisplay' | 'testPattern', send: (p: Projector) => ReturnType<Gateway['command']>) {
    const p = find(id)
    if (!p) return
    if (!deviceCapabilities(p).includes(capability)) {
      if (capability === 'osdDisplay') return // hầu hết máy chưa có lệnh OSD: chỉ đổi trạng thái trong app, không ghi log mỗi lần bấm
      const why = capability === 'testPattern' ? 'no test pattern command set in COMMANDS on the projector page'
        : TEMPLATE_PROTOCOLS.includes(p.network.protocol.type) ? 'no command template configured on the projector page' : `${p.network.protocol.type} has no verified live command`
      dispatch({ type: 'projector/log', id, level: 'warn', message: `"${capability}" is not sent to the device: ${why} (local change only)` })
      return
    }
    busyUntil.set(id, Date.now() + HOLD_MS)
    const result = await send(p)
    if (!result.ok) {
      busyUntil.delete(id)
      dispatch({ type: 'projector/sync', id, result: { ok: false, code: result.code, message: `${capability}: ${result.message}` } })
    }
  }

  return {
    power: (ids, power) => ids.forEach(id => void run(id, 'power', p => gateway.command(p, { kind: 'power', value: power }))),
    shutter: (ids, closed) => ids.forEach(id => void run(id, 'shutter', p => gateway.command(p, { kind: 'shutter', closed }))),
    input: (id, input) => void run(id, 'input', p => gateway.command(p, { kind: 'input', input })),
    osd: (id, key) => void run(id, 'osd', p => gateway.command(p, { kind: 'osd', key })),
    testPattern: (ids, enabled, pattern) => ids.forEach(id => {
      const on = enabled ?? find(id)?.testPattern.enabled
      if (!on && enabled === undefined) return
      void run(id, 'testPattern', p => gateway.command(p, { kind: 'testPattern', enabled: !!on, pattern: pattern ?? p.testPattern.type }))
    }),
    osdDisplay: (ids, visible) => ids.forEach(id => void run(id, 'osdDisplay', p => gateway.command(p, { kind: 'osdDisplay', visible }))),
  }
}

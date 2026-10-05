import type { Dispatch } from 'react'
import { TEMPLATE_PROTOCOLS, supportsTestPattern, type OsdKeyDto } from '../../shared/api.ts'
import type { Gateway } from '@/services/gateway'
import { deviceCapabilities } from '@/services/capabilities'
import type { InputSource, Projector } from '@/types'
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
  power(ids: string[], power: 'on' | 'standby' | 'off'): void
  shutter(ids: string[], closed: boolean): void
  input(id: string, input: InputSource): void
  osd(id: string, key: OsdKeyDto): void
  /** `enabled` bỏ trống = chỉ đổi loại mẫu: gửi lại nếu máy đang hiện test pattern. */
  testPattern(ids: string[], enabled: boolean | undefined, pattern?: string): void
  osdDisplay(ids: string[], visible: boolean): void
  /** Độ sáng 0–100 % (chỉ máy có lệnh độ sáng; còn lại là thay đổi cục bộ). */
  brightness(id: string, percent: number): void
}

export function createDeviceEffects(gateway: Gateway, find: (id: string) => Projector | undefined, dispatch: Dispatch<ProjectAction>): DeviceEffects {
  async function run(id: string, capability: 'power' | 'shutter' | 'input' | 'osd' | 'osdDisplay' | 'testPattern' | 'brightness', send: (p: Projector) => ReturnType<Gateway['command']>, hooks: { onSkipped?: () => void; onSent?: () => void } = {}) {
    const p = find(id)
    if (!p) return
    if (!deviceCapabilities(p).includes(capability)) {
      if (capability === 'osdDisplay') return // hầu hết máy chưa có lệnh OSD: chỉ đổi trạng thái trong app, không ghi log mỗi lần bấm
      const why = capability === 'testPattern' ? 'no test pattern command set in COMMANDS on the projector page'
        : capability === 'brightness' ? `${p.network.protocol.type} has no verified brightness command`
        : TEMPLATE_PROTOCOLS.includes(p.network.protocol.type) ? 'no command template configured on the projector page' : `${p.network.protocol.type} has no verified live command`
      dispatch({ type: 'projector/log', id, level: 'warn', message: `"${capability}" is not sent to the device: ${why} (local change only)` })
      hooks.onSkipped?.() // không có lệnh thật → không có gì để chờ xác nhận: đặt trạng thái cuối ngay
      return
    }
    busyUntil.set(id, Date.now() + HOLD_MS)
    const result = await send(p)
    if (result.ok) hooks.onSent?.()
    if (!result.ok && result.code === 'unsupported') {
      // Máy từ chối vì không có lệnh này: chỉ ghi vào nhật ký — không phải lỗi kết nối / giao thức của máy.
      busyUntil.delete(id)
      dispatch({ type: 'projector/log', id, level: 'warn', message: `${capability}: ${result.message}` })
      return
    }
    if (!result.ok) {
      busyUntil.delete(id)
      dispatch({ type: 'projector/sync', id, result: { ok: false, code: result.code, message: `${capability}: ${result.message}` } })
    }
  }

  return {
    power: (ids, power) => ids.forEach(id => void run(id, 'power', p => gateway.command(p, { kind: 'power', value: power }), {
      // Gửi thành công → khởi động / làm nguội (chờ máy xác nhận); không có lệnh thật → đặt trạng thái cuối ngay.
      onSent: () => dispatch({ type: 'projectors/setPower', ids: [id], power, pending: true }),
      onSkipped: () => dispatch({ type: 'projectors/setPower', ids: [id], power }),
    })),
    shutter: (ids, closed) => ids.forEach(id => void run(id, 'shutter', p => gateway.command(p, { kind: 'shutter', closed }))),
    input: (id, input) => void run(id, 'input', p => gateway.command(p, { kind: 'input', input })),
    osd: (id, key) => void run(id, 'osd', p => gateway.command(p, { kind: 'osd', key })),
    testPattern: (ids, enabled, pattern) => ids.forEach(id => {
      const on = enabled ?? find(id)?.testPattern.enabled
      if (!on && enabled === undefined) return
      const p0 = find(id)
      const wanted = pattern ?? p0?.testPattern.type
      if (on && p0 && wanted && !supportsTestPattern(p0.network.protocol.type, wanted) && !(p0.network.protocol.commands?.testPatternOn)) {
        dispatch({ type: 'projector/log', id, level: 'warn', message: `testPattern: ${p0.model} has no "${wanted}" test pattern (not sent)` })
        return
      }
      void run(id, 'testPattern', p => gateway.command(p, { kind: 'testPattern', enabled: !!on, pattern: pattern ?? p.testPattern.type }))
    }),
    brightness: (id, percent) => void run(id, 'brightness', p => gateway.command(p, { kind: 'brightness', percent })),
    osdDisplay: (ids, visible) => ids.forEach(id => void run(id, 'osdDisplay', p => gateway.command(p, { kind: 'osdDisplay', visible }))),
  }
}

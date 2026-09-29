import { beforeEach, describe, expect, test } from 'vitest'
import { getDeviceCredentials, getSharedCredentials, forgetDeviceCredentials, saveDeviceCredentials, saveSharedCredentials } from '@/services/credentialCache'
import { initialProjectState, projectReducer } from '@/store/projectReducer'
import { fillMissingCredentials, hasCredentials, needsAuth } from '@/utils/credentials'
import { createProjector } from '@/utils/projector'
import type { ProtocolType } from '@/types'

const proj = (id: string, ip: string, protocol: ProtocolType, creds: { username?: string; password?: string } = {}) => {
  const p = createProjector({ id, boothId: 'b', name: id, ip, protocol })
  return { ...p, network: { ...p.network, protocol: { ...p.network.protocol, ...creds } } }
}
const none = { device: () => null, shared: () => null }

describe('fillMissingCredentials', () => {
  test('máy cần đăng nhập nhận tài khoản dùng chung; máy không cần thì không', () => {
    const out = fillMissingCredentials([proj('a', '10.0.0.1', 'panasonic-nt-control'), proj('b', '10.0.0.2', 'christie-serial-ip')], { ...none, shared: () => ({ username: 'admin', password: 'pw' }) })
    expect(out[0]!.network.protocol).toMatchObject({ username: 'admin', password: 'pw' })
    expect(hasCredentials(out[1]!)).toBe(false)
  })

  test('cache riêng của máy thắng tài khoản dùng chung', () => {
    const out = fillMissingCredentials([proj('a', '10.0.0.1', 'pjlink-class2')], { device: () => ({ password: 'own' }), shared: () => ({ password: 'shared' }) })
    expect(out[0]!.network.protocol.password).toBe('own')
  })

  test('không bao giờ ghi đè tài khoản đã có', () => {
    const out = fillMissingCredentials([proj('a', '10.0.0.1', 'pjlink-class2', { password: 'mine' })], { ...none, shared: () => ({ password: 'shared' }) })
    expect(out[0]!.network.protocol.password).toBe('mine')
  })

  test('needsAuth theo giao thức', () => {
    expect([needsAuth('pjlink-class1'), needsAuth('christie-serial-ip'), needsAuth('generic-tcp')]).toEqual([true, false, false])
  })
})

describe('projectors/setCredentials', () => {
  const state = () => ({ ...initialProjectState, projectors: [proj('a', '10.0.0.1', 'pjlink-class2'), proj('b', '10.0.0.2', 'pjlink-class2')] })

  test('đặt tài khoản cho đúng các máy được chọn', () => {
    const s = projectReducer(state(), { type: 'projectors/setCredentials', ids: ['a'], username: 'u', password: 'p' })
    expect(s.projectors[0]!.network.protocol).toMatchObject({ username: 'u', password: 'p' })
    expect(hasCredentials(s.projectors[1]!)).toBe(false)
  })

  test('máy đang bị từ chối xác thực được thử lại sau khi đổi tài khoản', () => {
    const base = state()
    base.projectors[0] = { ...base.projectors[0]!, connection: 'protocol-error', errors: ['Protocol error', 'Fan'] }
    const s = projectReducer(base, { type: 'projectors/setCredentials', ids: ['a'], password: 'new' })
    expect(s.projectors[0]).toMatchObject({ connection: 'connected', errors: ['Fan'] })
  })

  test('đăng xuất (không truyền gì) xoá tài khoản', () => {
    let s = projectReducer(state(), { type: 'projectors/setCredentials', ids: ['a'], username: 'u', password: 'p' })
    s = projectReducer(s, { type: 'projectors/setCredentials', ids: ['a'] })
    expect(hasCredentials(s.projectors[0]!)).toBe(false)
  })
})

describe('credentialCache (sessionStorage)', () => {
  beforeEach(() => {
    const data = new Map<string, string>()
    ;(globalThis as any).sessionStorage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) }
  })

  test('lưu, đọc và quên theo ip:port', () => {
    saveDeviceCredentials('10.0.0.1', 4352, { password: 'x' })
    expect(getDeviceCredentials('10.0.0.1', 4352)).toEqual({ password: 'x' })
    expect(getDeviceCredentials('10.0.0.1', 1024)).toBeNull()
    forgetDeviceCredentials('10.0.0.1', 4352)
    expect(getDeviceCredentials('10.0.0.1', 4352)).toBeNull()
  })

  test('tài khoản dùng chung', () => {
    expect(getSharedCredentials()).toBeNull()
    saveSharedCredentials({ username: 'admin', password: 'pw' })
    expect(getSharedCredentials()).toEqual({ username: 'admin', password: 'pw' })
  })

  test('không có sessionStorage thì không văng lỗi', () => {
    delete (globalThis as any).sessionStorage
    expect(() => saveSharedCredentials({ password: 'x' })).not.toThrow()
    expect(getSharedCredentials()).toBeNull()
  })
})

describe('effectiveCapabilities', () => {
  test('giao thức chung: power / shutter chỉ bật khi có đủ cặp mẫu lệnh', async () => {
    const { effectiveCapabilities } = await import('../../shared/api.ts')
    expect(effectiveCapabilities('generic-tcp')).toEqual(['raw'])
    expect(effectiveCapabilities('generic-tcp', { powerOn: 'a' })).toEqual(['raw'])
    expect(effectiveCapabilities('generic-tcp', { powerOn: 'a', powerOff: 'b' })).toEqual(['power', 'raw'])
    expect(effectiveCapabilities('http-api', { powerOn: 'a', powerOff: 'b', shutterClose: 'c', shutterOpen: 'd' })).toEqual(['power', 'shutter', 'raw'])
    expect(effectiveCapabilities('pjlink-class2', { powerOn: 'a', powerOff: 'b' })).toEqual(['power', 'shutter', 'input', 'raw'])
    expect(effectiveCapabilities('barco-xlm', { powerOn: 'a', powerOff: 'b' })).toEqual([])
  })
})

import { useCallback, useMemo, useState } from 'react'
import { MOCK_BOOTHS } from '@/data/mock'
import { defaultProtocolConfig } from '@/constants/protocols'
import { isValidIPv4 } from '@/utils/network'
import { getSharedCredentials, saveSharedCredentials } from '@/services/credentialCache'
import { needsAuth, withCredentials } from '@/utils/credentials'
import { createProjector } from '@/utils/projector'
import type { Booth, DiscoveredDevice, Project, Projector, ProtocolType } from '@/types'

export interface DraftDevice {
  projector: Projector
  source: 'scan' | 'manual'
  selected: boolean
  /** Thiết bị đòi mật khẩu → hiện ô nhập thông tin đăng nhập. */
  authRequired: boolean
}

export interface ManualDeviceInput {
  ip: string
  name: string
  protocol: ProtocolType
  model?: string
  username?: string
  password?: string
}

/** Trạng thái của quy trình "New Project": thông tin, Booth, thiết bị (quét + thêm tay) và việc phân bổ. */
export function useNewProjectDraft() {
  const [name, setName] = useState('')
  const [venue, setVenue] = useState('')
  const [booths, setBooths] = useState<Booth[]>(() => MOCK_BOOTHS.map(b => ({ ...b })))
  const [devices, setDevices] = useState<DraftDevice[]>([])
  // Tài khoản dùng chung (nhiều hãng hay đặt giống nhau): máy mới tìm thấy tự điền, nút "apply to all" áp cho cả danh sách.
  const [shared, setSharedState] = useState<{ username: string; password: string }>(() => {
    const c = getSharedCredentials()
    return { username: c?.username ?? '', password: c?.password ?? '' }
  })
  const hasShared = !!(shared.username || shared.password)
  const sharedCreds = { username: shared.username || undefined, password: shared.password || undefined }

  // Id nháp = IP (duy nhất trong draft); id hiển thị PJ-xx được cấp lúc launch.
  const addDiscovered = useCallback((d: DiscoveredDevice) => {
    setDevices(prev => {
      const key = `${d.ip}:${d.protocol}`
      if (prev.some(x => `${x.projector.network.ip}:${x.projector.network.protocol.type}` === key)) return prev
      const boothId = d.suggestedBoothId && booths.some(b => b.id === d.suggestedBoothId) ? d.suggestedBoothId : (booths[0]?.id ?? '')
      const base = createProjector({ id: d.ip, boothId, name: d.name ?? d.model ?? `${d.manufacturer ?? 'Projector'} ${d.ip}`, ip: d.ip, location: d.location, model: d.model ?? d.manufacturer, protocol: d.protocol })
      let projector = { ...base, network: { ...base.network, protocol: { ...base.network.protocol, port: d.port } } }
      if (d.authRequired && hasShared) projector = withCredentials(projector, sharedCreds)
      return [...prev, { projector, source: 'scan', selected: true, authRequired: d.authRequired }]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booths, hasShared, shared.username, shared.password])

  const clearScanned = useCallback(() => setDevices(prev => prev.filter(d => d.source === 'manual')), [])

  /** Trả về thông báo lỗi, hoặc `null` nếu thêm thành công. */
  const addManual = useCallback((input: ManualDeviceInput): string | null => {
    const ip = input.ip.trim()
    if (!isValidIPv4(ip)) return 'Invalid IP address format'
    if (devices.some(d => d.projector.network.ip === ip)) return 'This IP is already in the list'
    const base = createProjector({ id: ip, boothId: booths[0]?.id ?? '', name: input.name.trim() || `Projector ${ip}`, ip, location: 'Manual', model: input.model, protocol: input.protocol })
    const typed = !!(input.username || input.password)
    const useShared = !typed && hasShared && needsAuth(input.protocol)
    const protocol = { ...base.network.protocol, username: input.username || (useShared ? sharedCreds.username : undefined), password: input.password || (useShared ? sharedCreds.password : undefined) }
    const projector = { ...base, network: { ...base.network, protocol } }
    setDevices(prev => [...prev, { projector, source: 'manual', selected: true, authRequired: typed || useShared }])
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, booths, hasShared, shared.username, shared.password])

  const patchDevice = useCallback((ip: string, patch: (p: Projector) => Projector) => {
    setDevices(prev => prev.map(d => (d.projector.network.ip === ip ? { ...d, projector: patch(d.projector) } : d)))
  }, [])

  const setSelected = useCallback((ip: string, selected: boolean) => {
    setDevices(prev => prev.map(d => (d.projector.network.ip === ip ? { ...d, selected } : d)))
  }, [])

  const setCredentialsOf = useCallback(
    (ip: string, creds: { username?: string; password?: string }) =>
      patchDevice(ip, p => ({ ...p, network: { ...p.network, protocol: { ...p.network.protocol, ...creds } } })),
    [patchDevice],
  )

  const setShared = useCallback((next: { username: string; password: string }) => {
    setSharedState(next)
    saveSharedCredentials(next.username || next.password ? { username: next.username || undefined, password: next.password || undefined } : null)
  }, [])

  /** Áp tài khoản dùng chung cho mọi máy cần đăng nhập; trả về số máy đã áp. */
  const applySharedToAll = useCallback(() => {
    let count = 0
    setDevices(prev => prev.map(d => {
      if (!d.authRequired || !needsAuth(d.projector.network.protocol.type)) return d
      count++
      return { ...d, projector: withCredentials(d.projector, sharedCreds) }
    }))
    return count
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shared.username, shared.password])

  const setBoothOf = useCallback((ip: string, boothId: string) => patchDevice(ip, p => ({ ...p, boothId })), [patchDevice])

  const setProtocolOf = useCallback(
    (ip: string, type: ProtocolType) => patchDevice(ip, p => ({ ...p, network: { ...p.network, protocol: defaultProtocolConfig(type) } })),
    [patchDevice],
  )

  const addBooth = useCallback((boothName: string) => {
    const trimmed = boothName.trim()
    if (!trimmed) return
    setBooths(prev => [...prev, { id: `booth-${Date.now().toString(36)}`, name: trimmed, location: 'Unspecified' }])
  }, [])

  const removeBooth = useCallback((id: string) => {
    if (booths.length <= 1) return
    const fallback = booths.find(b => b.id !== id)!.id
    setBooths(prev => prev.filter(b => b.id !== id))
    setDevices(prev => prev.map(d => (d.projector.boothId === id ? { ...d, projector: { ...d.projector, boothId: fallback } } : d)))
  }, [booths])

  const selectedCount = devices.filter(d => d.selected).length

  const buildLaunchPayload = useMemo(() => () => {
    const project: Project = {
      id: `proj-${Date.now()}`,
      name: name.trim() || 'New Project',
      venue: venue.trim() || 'Unspecified Venue',
      createdAt: new Date().toISOString(),
    }
    const projectors = devices
      .filter(d => d.selected)
      .map((d, i) => ({ ...d.projector, id: `PJ-${String(i + 1).padStart(2, '0')}` }))
    return { project, booths, projectors }
  }, [name, venue, booths, devices])

  return { name, setName, venue, setVenue, booths, addBooth, removeBooth, devices, addDiscovered, clearScanned, addManual, setSelected, setBoothOf, setProtocolOf, setCredentialsOf, shared, setShared, applySharedToAll, selectedCount, buildLaunchPayload }
}

import { useCallback, useMemo, useState } from 'react'
import { defaultProtocolConfig } from '@/constants/protocols'
import { isValidIPv4 } from '@/utils/network'
import { hasCredentials, needsAuth, withCredentials, type Credentials } from '@/utils/credentials'
import { createProjector } from '@/utils/projector'
import type { Booth, DiscoveredDevice, Project, Projector, ProtocolType } from '@/types'

export interface DraftDevice {
  projector: Projector
  source: 'scan' | 'manual'
  selected: boolean
  /** Thiết bị đòi đăng nhập → gắn nhãn LOGIN; nhận tài khoản khi bấm LOGIN & LAUNCH. */
  authRequired: boolean
}

export interface ManualDeviceInput {
  ip: string
  name: string
  protocol: ProtocolType
  model?: string
}

export const DEFAULT_BOOTH: Booth = { id: 'booth-1', name: 'Booth 1', location: '' }

/** Trạng thái của quy trình "New Project": thông tin, Booth, thiết bị (quét + thêm tay) và việc phân bổ. */
export function useNewProjectDraft() {
  const [name, setName] = useState('')
  const [booths, setBooths] = useState<Booth[]>(() => [DEFAULT_BOOTH])
  const [devices, setDevices] = useState<DraftDevice[]>([])

  // Id nháp = IP (duy nhất trong draft); id hiển thị PJ-xx được cấp lúc launch.
  const addDiscovered = useCallback((d: DiscoveredDevice) => {
    setDevices(prev => {
      // Một IP = một máy. Máy trả lời nhiều giao thức (RQ35K có cả PJLink lẫn NTCONTROL) chỉ giữ một dòng,
      // ưu tiên giao thức riêng của hãng vì điều khiển được nhiều hơn PJLink.
      const existing = prev.find(x => x.projector.network.ip === d.ip)
      if (existing) {
        const existingIsPjlink = existing.projector.network.protocol.type.startsWith('pjlink')
        if (existing.source === 'manual' || !existingIsPjlink || d.protocol.startsWith('pjlink')) return prev
        prev = prev.filter(x => x !== existing)
      }
      const boothId = d.suggestedBoothId && booths.some(b => b.id === d.suggestedBoothId) ? d.suggestedBoothId : (booths[0]?.id ?? '')
      const base = createProjector({ id: d.ip, boothId, name: d.name ?? d.model ?? `${d.manufacturer ?? 'Projector'} ${d.ip}`, ip: d.ip, location: d.location, model: d.model ?? d.manufacturer, protocol: d.protocol })
      const projector = { ...base, network: { ...base.network, protocol: { ...base.network.protocol, port: d.port } } }
      return [...prev, { projector, source: 'scan', selected: true, authRequired: d.authRequired }]
    })
  }, [booths])

  const clearScanned = useCallback(() => setDevices(prev => prev.filter(d => d.source === 'manual')), [])

  /** Trả về thông báo lỗi, hoặc `null` nếu thêm thành công. */
  const addManual = useCallback((input: ManualDeviceInput): string | null => {
    const ip = input.ip.trim()
    if (!isValidIPv4(ip)) return 'Invalid IP address format'
    if (devices.some(d => d.projector.network.ip === ip)) return 'This IP is already in the list'
    const base = createProjector({ id: ip, boothId: booths[0]?.id ?? '', name: input.name.trim() || `Projector ${ip}`, ip, location: 'Manual', model: input.model, protocol: input.protocol })
    setDevices(prev => [...prev, { projector: base, source: 'manual', selected: true, authRequired: needsAuth(input.protocol) }])
    return null
  }, [devices, booths])

  const patchDevice = useCallback((ip: string, patch: (p: Projector) => Projector) => {
    setDevices(prev => prev.map(d => (d.projector.network.ip === ip ? { ...d, projector: patch(d.projector) } : d)))
  }, [])

  const setSelected = useCallback((ip: string, selected: boolean) => {
    setDevices(prev => prev.map(d => (d.projector.network.ip === ip ? { ...d, selected } : d)))
  }, [])

  const setBoothOf = useCallback((ip: string, boothId: string) => patchDevice(ip, p => ({ ...p, boothId })), [patchDevice])

  const setProtocolOf = useCallback(
    (ip: string, type: ProtocolType) => patchDevice(ip, p => ({ ...p, network: { ...p.network, protocol: defaultProtocolConfig(type) } })),
    [patchDevice],
  )

  const addBooth = useCallback((boothName: string) => {
    const trimmed = boothName.trim()
    if (!trimmed) return
    setBooths(prev => [...prev, { id: `booth-${Date.now().toString(36)}`, name: trimmed, location: '' }])
  }, [])

  const removeBooth = useCallback((id: string) => {
    if (booths.length <= 1) return
    const fallback = booths.find(b => b.id !== id)!.id
    setBooths(prev => prev.filter(b => b.id !== id))
    setDevices(prev => prev.map(d => (d.projector.boothId === id ? { ...d, projector: { ...d.projector, boothId: fallback } } : d)))
  }, [booths])

  const selectedCount = devices.filter(d => d.selected).length

  /** `login`: áp cho mọi máy cần đăng nhập mà chưa có tài khoản (LOGIN & LAUNCH). */
  const buildLaunchPayload = useMemo(() => (login?: Credentials) => {
    const project: Project = {
      id: `proj-${Date.now()}`,
      name: name.trim() || 'New Project',
      createdAt: new Date().toISOString(),
    }
    const projectors = devices
      .filter(d => d.selected)
      .map((d, i) => {
        const p = { ...d.projector, id: `PJ-${String(i + 1).padStart(2, '0')}` }
        return login && needsAuth(p.network.protocol.type) && !hasCredentials(p) ? withCredentials(p, login) : p
      })
    return { project, booths, projectors }
  }, [name, booths, devices])

  return { name, setName, booths, addBooth, removeBooth, devices, addDiscovered, clearScanned, addManual, setSelected, setBoothOf, setProtocolOf, selectedCount, buildLaunchPayload }
}

import { useCallback, useMemo, useState } from 'react'
import { MOCK_BOOTHS, type DiscoverableDevice } from '@/data/mock'
import { defaultProtocolConfig } from '@/constants/protocols'
import { isValidIPv4 } from '@/utils/network'
import { createProjector } from '@/utils/projector'
import type { Booth, Project, Projector, ProtocolType } from '@/types'

export interface DraftDevice {
  projector: Projector
  source: 'scan' | 'manual'
  selected: boolean
}

/** Trạng thái của quy trình "New Project": thông tin, Booth, thiết bị (quét + thêm tay) và việc phân bổ. */
export function useNewProjectDraft() {
  const [name, setName] = useState('')
  const [venue, setVenue] = useState('')
  const [booths, setBooths] = useState<Booth[]>(() => MOCK_BOOTHS.map(b => ({ ...b })))
  const [devices, setDevices] = useState<DraftDevice[]>([])

  // Id nháp = IP (duy nhất trong draft); id hiển thị PJ-xx được cấp lúc launch.
  const addDiscovered = useCallback((d: DiscoverableDevice) => {
    setDevices(prev => {
      if (prev.some(x => x.projector.network.ip === d.ip)) return prev
      const boothId = booths.some(b => b.id === d.suggestedBoothId) ? d.suggestedBoothId : (booths[0]?.id ?? '')
      const projector = createProjector({ id: d.ip, boothId, name: d.name, ip: d.ip, location: d.location, model: d.model, protocol: d.protocol })
      return [...prev, { projector, source: 'scan', selected: true }]
    })
  }, [booths])

  const clearScanned = useCallback(() => setDevices(prev => prev.filter(d => d.source === 'manual')), [])

  /** Trả về thông báo lỗi, hoặc `null` nếu thêm thành công. */
  const addManual = useCallback((ip: string, displayName: string, protocol: ProtocolType): string | null => {
    const trimmed = ip.trim()
    if (!isValidIPv4(trimmed)) return 'Invalid IP address format'
    if (devices.some(d => d.projector.network.ip === trimmed)) return 'This IP is already in the list'
    const projector = createProjector({ id: trimmed, boothId: booths[0]?.id ?? '', name: displayName.trim() || `Projector ${trimmed}`, ip: trimmed, location: 'Manual', protocol })
    setDevices(prev => [...prev, { projector, source: 'manual', selected: true }])
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

  return { name, setName, venue, setVenue, booths, addBooth, removeBooth, devices, addDiscovered, clearScanned, addManual, setSelected, setBoothOf, setProtocolOf, selectedCount, buildLaunchPayload }
}

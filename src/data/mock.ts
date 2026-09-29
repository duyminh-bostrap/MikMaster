import type { Booth, DiscoveredDevice, LensPreset, Projector, SavedProjectSummary } from '@/types'
import { createProjector } from '@/utils/projector'

export const MOCK_BOOTHS: Booth[] = [
  { id: 'booth-a', name: 'Main Stage', location: 'FOH Zone' },
  { id: 'booth-b', name: 'LED Wall Zone', location: 'Downstage Floor' },
  { id: 'booth-c', name: 'Rear Screen', location: 'Upstage Truss' },
]

function preset(slot: LensPreset['slot'], name: string, shiftX: number, shiftY: number, zoom: number, focus: number, savedAt: string): LensPreset {
  return { slot, name, position: { shiftX, shiftY, zoom, focus }, savedAt }
}

type ProjectorSeed = Omit<Parameters<typeof createProjector>[0], 'id'>

function build(id: string, base: ProjectorSeed, patch: Partial<Projector>): Projector {
  return { ...createProjector({ ...base, id }), ...patch }
}

/** Danh sách máy chiếu mẫu (đã có trạng thái vận hành). */
export function createMockProjectors(): Projector[] {
  return [
    build('PJ-01', { boothId: 'booth-a', name: 'Stage Left', location: 'FOH Truss L', ip: '192.168.10.21', model: 'Christie Griffyn 4K32-RGB', protocol: 'christie-serial-ip' }, {
      power: 'on', input: 'HDMI 1',
      telemetry: { temperatureC: 62, lampHours: 1240, brightness: 85 },
      lens: {
        position: { shiftX: 0, shiftY: 5, zoom: 85, focus: 72 },
        presets: [preset(1, 'Main Show', 0, 5, 85, 72, '2026-09-28T18:34:00'), preset(2, 'Rehearsal', 0, 0, 80, 70, '2026-09-27T14:10:00'), null, null],
        activePreset: 1,
      },
    }),
    build('PJ-02', { boothId: 'booth-a', name: 'Stage Right', location: 'FOH Truss R', ip: '192.168.10.22', model: 'Christie Griffyn 4K32-RGB', protocol: 'christie-serial-ip' }, {
      power: 'on', input: 'HDMI 2',
      telemetry: { temperatureC: 58, lampHours: 1238, brightness: 85 },
      lens: {
        position: { shiftX: 0, shiftY: 5, zoom: 85, focus: 72 },
        presets: [preset(1, 'Main Show', 0, 5, 85, 72, '2026-09-28T18:34:00'), null, null, null],
        activePreset: 1,
      },
    }),
    build('PJ-03', { boothId: 'booth-a', name: 'Center Fill', location: 'Mid Truss C', ip: '192.168.10.23', model: 'Panasonic PT-RQ35K', protocol: 'panasonic-nt-control' }, {
      power: 'on', shutter: true, input: 'SDI 1',
      telemetry: { temperatureC: 71, lampHours: 3102, brightness: 100 },
      errors: ['High Temp'],
      log: [{ id: 'l0', at: '2026-09-29T10:02:00', level: 'error', message: 'Temperature 71°C exceeds 70°C threshold' }],
      lens: { position: { shiftX: 0, shiftY: 0, zoom: 90, focus: 68 }, presets: [null, null, null, null], activePreset: null },
    }),
    build('PJ-04', { boothId: 'booth-b', name: 'LED Wall A', location: 'DS Floor Left', ip: '192.168.10.41', model: 'Panasonic PT-RQ35K', protocol: 'panasonic-nt-control' }, {
      power: 'on', input: 'SDI 1',
      telemetry: { temperatureC: 45, lampHours: 210, brightness: 70 },
      testPattern: { enabled: true, type: 'color-bars' },
      lens: {
        position: { shiftX: -10, shiftY: 0, zoom: 60, focus: 80 },
        presets: [preset(1, 'Wide', -10, 0, 60, 80, '2026-09-29T09:00:00'), null, null, null],
        activePreset: null,
      },
    }),
    build('PJ-05', { boothId: 'booth-b', name: 'LED Wall B', location: 'DS Floor Right', ip: '192.168.10.42', model: 'Panasonic PT-RQ35K', protocol: 'panasonic-nt-control' }, {
      power: 'standby', input: 'SDI 1',
      telemetry: { temperatureC: 31, lampHours: 208, brightness: 0 },
      errors: ['No Signal'],
      log: [{ id: 'l1', at: '2026-09-29T08:12:00', level: 'warn', message: 'No input signal on SDI 1' }],
      lens: { position: { shiftX: 0, shiftY: 0, zoom: 60, focus: 75 }, presets: [null, null, null, null], activePreset: null },
    }),
    build('PJ-06', { boothId: 'booth-c', name: 'Rear Blend', location: 'Upstage Truss', ip: '192.168.10.30', model: 'Christie Griffyn 4K32-RGB', protocol: 'christie-serial-ip' }, {
      power: 'off', input: 'HDBaseT',
      connection: 'disconnected', errors: ['Offline'],
      log: [
        { id: 'l2', at: '2026-09-29T09:41:00', level: 'error', message: 'Connection timeout after 3 retries (192.168.10.30:3002)' },
        { id: 'l3', at: '2026-09-29T09:40:00', level: 'error', message: 'Socket closed by remote host' },
      ],
      telemetry: { temperatureC: 24, lampHours: 890, brightness: 0 },
      lens: { position: { shiftX: 0, shiftY: 0, zoom: 75, focus: 65 }, presets: [null, null, null, null], activePreset: null },
    }),
  ]
}

export interface DiscoverableDevice extends DiscoveredDevice {
  /** Mốc (0–100%) tại đó thiết bị "xuất hiện" trong lúc quét giả lập. */
  foundAtPct: number
}

/** Thiết bị mà bộ quét giả lập sẽ tìm thấy. */
export const MOCK_DISCOVERABLE: DiscoverableDevice[] = [
  { ip: '192.168.10.21', port: 3002, name: 'Stage Left', location: 'FOH Truss L', model: 'Christie Griffyn 4K32-RGB', suggestedBoothId: 'booth-a', protocol: 'christie-serial-ip', authRequired: false, foundAtPct: 12 },
  { ip: '192.168.10.22', port: 3002, name: 'Stage Right', location: 'FOH Truss R', model: 'Christie Griffyn 4K32-RGB', suggestedBoothId: 'booth-a', protocol: 'christie-serial-ip', authRequired: false, foundAtPct: 25 },
  { ip: '192.168.10.23', port: 1024, name: 'Center Fill', location: 'Mid Truss C', model: 'Panasonic PT-RQ35K', suggestedBoothId: 'booth-a', protocol: 'panasonic-nt-control', authRequired: false, foundAtPct: 44 },
  { ip: '192.168.10.30', port: 3002, name: 'Rear Blend', location: 'Upstage Truss', model: 'Christie Griffyn 4K32-RGB', suggestedBoothId: 'booth-c', protocol: 'christie-serial-ip', authRequired: false, foundAtPct: 62 },
  { ip: '192.168.10.41', port: 1024, name: 'LED Wall A', location: 'DS Floor Left', model: 'Panasonic PT-RQ35K', suggestedBoothId: 'booth-b', protocol: 'panasonic-nt-control', authRequired: false, foundAtPct: 78 },
  { ip: '192.168.10.42', port: 1024, name: 'LED Wall B', location: 'DS Floor Right', model: 'Panasonic PT-RQ35K', suggestedBoothId: 'booth-b', protocol: 'panasonic-nt-control', authRequired: false, foundAtPct: 90 },
]

export const MOCK_SAVED_PROJECTS: SavedProjectSummary[] = [
  { id: 'sp-1', name: 'Grand Tech Summit 2026', venue: 'Hanoi National Convention Centre', savedAt: '2026-09-26T10:00:00', deviceCount: 6 },
  { id: 'sp-2', name: 'CES Asia Booth Setup', venue: 'SECC Ho Chi Minh City', savedAt: '2026-09-12T10:00:00', deviceCount: 4 },
  { id: 'sp-3', name: 'Brand Launch — Vinfast', venue: 'Opera House, Hanoi', savedAt: '2026-08-30T10:00:00', deviceCount: 3 },
]

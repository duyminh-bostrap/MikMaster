import { createProjector } from '@/utils/projector'
import type { Booth, Projector } from '@/types'
import type { ProjectSnapshot } from './projectRepository'

/*
 * Lưu / mở project dưới dạng một file JSON trên máy (`<tên>.mikmaster.json`).
 * Mật khẩu máy chiếu KHÔNG được ghi vào file (file hay bị copy, gửi qua chat, để trong USB);
 * username được giữ. Khi mở file, app hỏi đăng nhập một lần cho mọi máy cần mật khẩu.
 */

export const FILE_FORMAT = 'mikmaster-project'
export const FILE_VERSION = 1
export const FILE_EXTENSION = '.mikmaster.json'

export class ProjectFileError extends Error {}

export function serializeProject(snapshot: ProjectSnapshot): string {
  const projectors = snapshot.projectors.map(p => {
    const { password: _omit, ...protocol } = p.network.protocol
    return { ...p, network: { ...p.network, protocol } }
  })
  return JSON.stringify({ format: FILE_FORMAT, version: FILE_VERSION, exportedAt: new Date().toISOString(), ...snapshot, projectors }, null, 2)
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Đọc và kiểm tra file; trường thiếu (file từ bản cũ) được điền mặc định. */
export function parseProjectFile(text: string): ProjectSnapshot {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { throw new ProjectFileError('This is not a valid project file (not JSON).') }
  if (!isObject(raw) || raw.format !== FILE_FORMAT) throw new ProjectFileError('This is not a MikMaster project file.')
  if (typeof raw.version !== 'number' || raw.version > FILE_VERSION) throw new ProjectFileError('This file was made by a newer version of MikMaster.')
  const { project, booths, projectors } = raw
  if (!isObject(project) || typeof project.name !== 'string' || !Array.isArray(booths) || !Array.isArray(projectors)) {
    throw new ProjectFileError('The project file is incomplete or damaged.')
  }

  const boothList: Booth[] = booths.filter(isObject).filter(b => typeof b.id === 'string' && typeof b.name === 'string')
    .map(b => ({ id: b.id as string, name: b.name as string }))
  if (boothList.length === 0) boothList.push({ id: 'booth-1', name: 'Booth 1' })
  const boothIds = new Set(boothList.map(b => b.id))

  const seen = new Set<string>()
  const projectorList: Projector[] = projectors.filter(isObject).map((p, i) => {
    const network = isObject(p.network) ? p.network : {}
    const protocol = isObject(network.protocol) ? network.protocol : {}
    const ip = typeof network.ip === 'string' ? network.ip : ''
    if (!ip) throw new ProjectFileError(`Projector #${i + 1} has no IP address.`)
    let id = typeof p.id === 'string' && p.id ? p.id : `PJ-${String(i + 1).padStart(2, '0')}`
    while (seen.has(id)) id = `${id}-${i + 1}`
    seen.add(id)
    const base = createProjector({ id, boothId: boothList[0]!.id, name: `Projector ${ip}`, ip, protocol: typeof protocol.type === 'string' ? (protocol.type as never) : undefined })
    const merged = { ...base, ...(p as Partial<Projector>), id } as Projector
    return {
      ...merged,
      boothId: boothIds.has(merged.boothId) ? merged.boothId : boothList[0]!.id,
      network: { ip, protocol: { ...base.network.protocol, ...(protocol as object), password: undefined } },
      // Trạng thái kết nối lưu trong file đã cũ; đọc lại từ thiết bị khi mở.
      connection: 'connected',
    }
  })

  return {
    project: {
      id: typeof project.id === 'string' && project.id ? project.id : `proj-${Date.now()}`,
      name: project.name,
      createdAt: typeof project.createdAt === 'string' ? project.createdAt : new Date().toISOString(),
    },
    booths: boothList,
    projectors: projectorList,
  }
}

export function suggestedFileName(name: string): string {
  const slug = name.trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').slice(0, 80) || 'project'
  return `${slug}${FILE_EXTENSION}`
}

type SavePicker = (opts: object) => Promise<{ createWritable(): Promise<{ write(d: Blob): Promise<void>; close(): Promise<void> }> }>
type OpenPicker = (opts: object) => Promise<Array<{ getFile(): Promise<File> }>>
const PICKER_TYPES = [{ description: 'MikMaster project', accept: { 'application/json': ['.json'] } }]
const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

/** Chrome/Edge: hộp thoại "Save As" chọn thư mục. Trình duyệt khác: tải về thư mục Downloads. Trả `false` nếu người dùng huỷ. */
export async function saveProjectToFile(snapshot: ProjectSnapshot): Promise<boolean> {
  const blob = new Blob([serializeProject(snapshot)], { type: 'application/json' })
  const fileName = suggestedFileName(snapshot.project.name)
  const picker = (window as unknown as { showSaveFilePicker?: SavePicker }).showSaveFilePicker
  if (picker) {
    try {
      const handle = await picker({ suggestedName: fileName, types: PICKER_TYPES })
      const out = await handle.createWritable()
      await out.write(blob)
      await out.close()
      return true
    } catch (e) {
      if (isAbort(e)) return false
      // Picker bị chặn (iframe, quyền) → rơi xuống tải về.
    }
  }
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}

/** Mở hộp thoại chọn file; `null` nếu người dùng huỷ. Ném `ProjectFileError` nếu file không hợp lệ. */
export async function openProjectFile(): Promise<ProjectSnapshot | null> {
  const file = await pickFile()
  return file ? parseProjectFile(await file.text()) : null
}

async function pickFile(): Promise<File | null> {
  const picker = (window as unknown as { showOpenFilePicker?: OpenPicker }).showOpenFilePicker
  if (picker) {
    try {
      const [handle] = await picker({ types: PICKER_TYPES, multiple: false })
      return handle ? await handle.getFile() : null
    } catch (e) {
      if (isAbort(e)) return null
    }
  }
  return new Promise(resolve => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' })
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null))
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}

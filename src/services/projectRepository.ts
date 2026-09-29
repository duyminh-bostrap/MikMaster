import type { ProjectSnapshotDto } from '../../shared/api.ts'
import type { Gateway } from './gateway'
import { createMockProjectors, MOCK_BOOTHS, MOCK_SAVED_PROJECTS } from '@/data/mock'
import type { Booth, Project, Projector, SavedProjectSummary } from '@/types'

/**
 * Có gateway → lưu/đọc phía server (mật khẩu máy chiếu được mã hoá trên đĩa).
 * Không có → dự án mẫu + localStorage (KHÔNG lưu mật khẩu máy chiếu ở đó).
 */
export interface ProjectSnapshot {
  project: Project
  booths: Booth[]
  projectors: Projector[]
}

const STORAGE_KEY = 'mikmaster.projects.v1'

function readStored(): Record<string, { summary: SavedProjectSummary; snapshot: ProjectSnapshot }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function listLocal(): SavedProjectSummary[] {
  return [...Object.values(readStored()).map(entry => entry.summary), ...MOCK_SAVED_PROJECTS]
}

/** Gộp server + localStorage + mẫu; trùng id thì ưu tiên server. */
export async function listSavedProjects(gateway: Gateway | null): Promise<SavedProjectSummary[]> {
  const remote = gateway ? await gateway.listProjects() : null
  const all = [...(remote?.ok ? remote.value : []), ...listLocal()]
  const unique = [...new Map(all.map(p => [p.id, p])).values()]
  return unique.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

function loadLocal(id: string): ProjectSnapshot | null {
  const stored = readStored()[id]
  if (stored) return stored.snapshot

  const sample = MOCK_SAVED_PROJECTS.find(p => p.id === id)
  if (!sample) return null
  return {
    project: { id: sample.id, name: sample.name, createdAt: sample.savedAt },
    booths: MOCK_BOOTHS,
    projectors: createMockProjectors().slice(0, sample.deviceCount),
  }
}

export async function loadProject(id: string, gateway: Gateway | null): Promise<ProjectSnapshot | null> {
  if (gateway) {
    const r = await gateway.loadProject(id)
    if (r.ok) return r.value as unknown as ProjectSnapshot
  }
  return loadLocal(id)
}

function withoutPasswords(snapshot: ProjectSnapshot): ProjectSnapshot {
  return {
    ...snapshot,
    projectors: snapshot.projectors.map(p => {
      const { password: _omit, ...protocol } = p.network.protocol
      return { ...p, network: { ...p.network, protocol } }
    }),
  }
}

/** Trả về `false` nếu không lưu được ở đâu cả. */
export async function saveProject(snapshot: ProjectSnapshot, gateway: Gateway | null): Promise<boolean> {
  if (gateway) {
    const r = await gateway.saveProject(snapshot as unknown as ProjectSnapshotDto)
    if (r.ok) return true
  }
  return saveLocal(snapshot)
}

/** Trả về `false` nếu trình duyệt từ chối ghi (hết quota, chế độ riêng tư...). */
function saveLocal(snapshot: ProjectSnapshot): boolean {
  try {
    const stored = readStored()
    stored[snapshot.project.id] = {
      summary: {
        id: snapshot.project.id,
        name: snapshot.project.name,
        savedAt: new Date().toISOString(),
        deviceCount: snapshot.projectors.length,
      },
      snapshot: withoutPasswords(snapshot),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    return true
  } catch {
    return false
  }
}

/** Project mẫu có sẵn trong app, không xoá được. */
export const isSampleProject = (id: string): boolean => MOCK_SAVED_PROJECTS.some(p => p.id === id)

/** Xoá bản lưu trên gateway (nếu có) và trong trình duyệt. `false` nếu không xoá được ở đâu. */
export async function deleteProject(id: string, gateway: Gateway | null): Promise<boolean> {
  if (isSampleProject(id)) return false
  let removed = false
  if (gateway) removed = (await gateway.deleteProject(id)).ok
  try {
    const stored = readStored()
    if (stored[id]) {
      delete stored[id]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
      removed = true
    }
  } catch { /* bỏ qua */ }
  return removed
}

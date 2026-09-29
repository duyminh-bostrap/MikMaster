import { createMockProjectors, MOCK_BOOTHS, MOCK_SAVED_PROJECTS } from '@/data/mock'
import type { Booth, Project, Projector, SavedProjectSummary } from '@/types'

/**
 * Điểm nối để thay bằng backend/Tauri/Electron sau này.
 * Hiện tại: dự án mẫu + lưu bản sao vào localStorage.
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

export function listSavedProjects(): SavedProjectSummary[] {
  const stored = Object.values(readStored()).map(entry => entry.summary)
  return [...stored, ...MOCK_SAVED_PROJECTS].sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export function loadProject(id: string): ProjectSnapshot | null {
  const stored = readStored()[id]
  if (stored) return stored.snapshot

  const sample = MOCK_SAVED_PROJECTS.find(p => p.id === id)
  if (!sample) return null
  return {
    project: { id: sample.id, name: sample.name, venue: sample.venue, createdAt: sample.savedAt },
    booths: MOCK_BOOTHS,
    projectors: createMockProjectors().slice(0, sample.deviceCount),
  }
}

/** Trả về `false` nếu trình duyệt từ chối ghi (hết quota, chế độ riêng tư...). */
export function saveProject(snapshot: ProjectSnapshot): boolean {
  try {
    const stored = readStored()
    stored[snapshot.project.id] = {
      summary: {
        id: snapshot.project.id,
        name: snapshot.project.name,
        venue: snapshot.project.venue,
        savedAt: new Date().toISOString(),
        deviceCount: snapshot.projectors.length,
      },
      snapshot,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    return true
  } catch {
    return false
  }
}

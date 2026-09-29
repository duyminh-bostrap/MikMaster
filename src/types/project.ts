export interface Project {
  id: string
  name: string
  venue: string
  /** ISO 8601 */
  createdAt: string
}

/** Nhóm máy chiếu theo vị trí vật lý (Project → Booth → Projector). */
export interface Booth {
  id: string
  name: string
  location: string
}

export interface SavedProjectSummary {
  id: string
  name: string
  venue: string
  /** ISO 8601 */
  savedAt: string
  deviceCount: number
}

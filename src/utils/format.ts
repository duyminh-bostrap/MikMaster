export function formatClock(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour12: false })
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

/** YYYY-MM-DD theo giờ địa phương. */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE')
}

export function formatSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

export function formatHours(n: number): string {
  return `${n.toLocaleString('en-US')}h`
}

/** Khoảng thời gian: "45m", "3h 07m", "2d 05h". Dưới 1 phút = "0m". */
export function formatDuration(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000))
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ${String(min % 60).padStart(2, '0')}m`
  return `${Math.floor(h / 24)}d ${String(h % 24).padStart(2, '0')}h`
}

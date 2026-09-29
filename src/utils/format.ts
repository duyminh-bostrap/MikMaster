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

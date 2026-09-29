import { useState, useEffect } from 'react'
import type { Projector, Booth, Project } from '../types'

const INPUTS = ['HDMI 1', 'HDMI 2', 'SDI 1', 'SDI 2', 'HDBaseT', 'DisplayPort', 'DVI']

function StatusDot({ power }: { power: Projector['power'] }) {
  if (power === 'on') return <span className="inline-block w-2 h-2 rounded-full flex-shrink-0 status-on" style={{ background: '#22C55E' }} />
  if (power === 'standby') return <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#F59E0B' }} />
  return <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#374151' }} />
}

function TempBar({ temp }: { temp: number }) {
  const pct = Math.min((temp / 90) * 100, 100)
  const color = temp > 70 ? '#EF4444' : temp > 55 ? '#F59E0B' : '#22C55E'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-0.5 rounded-full" style={{ background: 'var(--border)' }}>
        <div className="h-0.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-xs" style={{ color, minWidth: 32 }}>{temp}°C</span>
    </div>
  )
}

/* Fleet Health circular mini-gauge */
function FleetHealthGauge({ online, total }: { online: number; total: number }) {
  const pct = total === 0 ? 0 : online / total
  const r = 22
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  const color = pct >= 0.9 ? '#22C55E' : pct >= 0.6 ? '#F59E0B' : '#EF4444'
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="30" cy="30" r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
      <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  )
}

/* Temperature mini bar chart */
function TempChart({ projectors }: { projectors: Projector[] }) {
  const active = projectors.filter(p => p.power !== 'off')
  if (active.length === 0) return null
  const max = 90
  return (
    <div className="flex items-end gap-1" style={{ height: 32 }}>
      {active.map(p => {
        const h = Math.max(4, Math.round((p.temp / max) * 32))
        const color = p.temp > 70 ? '#EF4444' : p.temp > 55 ? '#F59E0B' : '#22C55E'
        return (
          <div key={p.id} title={`${p.name}: ${p.temp}°C`} className="rounded-sm flex-shrink-0" style={{ width: 10, height: h, background: color, opacity: 0.8 }} />
        )
      })}
    </div>
  )
}

function ProjectorCard({ proj, onSelect, onPowerToggle, onShutterToggle }: {
  proj: Projector
  onSelect: () => void
  onPowerToggle: () => void
  onShutterToggle: () => void
}) {
  const hasError = proj.errors.length > 0
  return (
    <div
      className="relative rounded overflow-hidden cursor-pointer group transition-all duration-200 scanlines"
      style={{ background: 'var(--card)', border: `1px solid ${hasError ? '#EF444440' : 'var(--border)'}`, boxShadow: hasError ? '0 0 0 1px #EF444420' : 'none' }}
      onClick={onSelect}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <StatusDot power={proj.power} />
          <span className="font-mono text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>{proj.id}</span>
          <span className="font-mono text-xs" style={{ color: 'var(--accent)', opacity: 0.6 }}>{proj.ip}</span>
        </div>
        <div className="flex items-center gap-1">
          {hasError && <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: '#EF444415', color: '#EF4444', border: '1px solid #EF444430' }}>{proj.errors[0]}</span>}
          {proj.shutter && <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: '#F59E0B15', color: '#F59E0B', border: '1px solid #F59E0B30' }}>SHUTTER</span>}
        </div>
      </div>

      {/* Projection preview */}
      <div className="relative flex items-center justify-center" style={{ height: 90, background: proj.power === 'on' && !proj.shutter ? '#080F1C' : '#070809' }}>
        {proj.power === 'on' && !proj.shutter ? (
          <div className="flex flex-col items-center gap-1">
            <div className="font-mono text-xs" style={{ color: 'var(--accent)', opacity: 0.7, letterSpacing: '0.15em' }}>{proj.input}</div>
            <div className="w-16 h-px" style={{ background: `linear-gradient(90deg, transparent, var(--accent), transparent)`, opacity: 0.5 }} />
            <div className="font-mono text-xs" style={{ color: '#22C55E', opacity: 0.6 }}>{proj.brightness}% BRT</div>
          </div>
        ) : proj.power === 'standby' ? (
          <span className="font-mono text-xs" style={{ color: '#F59E0B', opacity: 0.5, letterSpacing: '0.15em' }}>STANDBY</span>
        ) : (
          <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)', opacity: 0.35, letterSpacing: '0.15em' }}>OFF</span>
        )}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)' }} />
      </div>

      {/* Info */}
      <div className="px-3 py-2 flex flex-col gap-1" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{proj.name}</span>
          <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>{proj.lampHours.toLocaleString()}h</span>
        </div>
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{proj.location}</span>
        <TempBar temp={proj.temp} />
      </div>

      {/* Quick actions */}
      <div className="flex" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          className="flex-1 py-1.5 font-mono text-xs font-medium flex items-center justify-center gap-1"
          style={{ color: proj.power === 'on' ? '#22C55E' : 'var(--muted-foreground)', background: 'transparent', border: 'none', borderRight: '1px solid var(--border)', cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); onPowerToggle() }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
          </svg>
          {proj.power === 'on' ? 'ON' : proj.power === 'standby' ? 'STBY' : 'OFF'}
        </button>
        <button
          className="flex-1 py-1.5 font-mono text-xs font-medium flex items-center justify-center gap-1"
          style={{ color: proj.shutter ? '#F59E0B' : 'var(--muted-foreground)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          onClick={e => { e.stopPropagation(); onShutterToggle() }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          {proj.shutter ? 'CLOSED' : 'OPEN'}
        </button>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        style={{ background: 'rgba(245,158,11,0.03)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 'inherit' }}>
        <span className="font-mono text-xs" style={{ color: 'var(--primary)', letterSpacing: '0.08em' }}>OPEN CONTROL →</span>
      </div>
    </div>
  )
}

export default function Dashboard({ project, booths, projectors, onSelect, onUpdate }: {
  project: Project
  booths: Booth[]
  projectors: Projector[]
  onSelect: (id: string) => void
  onUpdate: (id: string, patch: Partial<Projector>) => void
}) {
  const [activeBooth, setActiveBooth] = useState<string>('all')
  const [expandedBooths, setExpandedBooths] = useState<Set<string>>(new Set(booths.map(b => b.id)))
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  function toggleBooth(id: string) {
    setExpandedBooths(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function boothPowerAll(boothId: string, power: 'on' | 'off') {
    projectors.filter(p => p.boothId === boothId).forEach(p => onUpdate(p.id, { power, brightness: power === 'on' ? 85 : 0 }))
  }

  function boothShutterAll(boothId: string, shutter: boolean) {
    projectors.filter(p => p.boothId === boothId).forEach(p => onUpdate(p.id, { shutter }))
  }

  function allPower(power: 'on' | 'off') {
    projectors.forEach(p => onUpdate(p.id, { power, brightness: power === 'on' ? 85 : 0 }))
  }

  function allShutter(shutter: boolean) {
    projectors.forEach(p => onUpdate(p.id, { shutter }))
  }

  const filtered = activeBooth === 'all' ? projectors : projectors.filter(p => p.boothId === activeBooth)
  const online = projectors.filter(p => p.power === 'on').length
  const errors = projectors.filter(p => p.errors.length > 0).length
  const avgTemp = projectors.filter(p => p.power !== 'off').length > 0
    ? Math.round(projectors.filter(p => p.power !== 'off').reduce((s, p) => s + p.temp, 0) / projectors.filter(p => p.power !== 'off').length)
    : 0
  const hottestUnit = projectors.reduce((a, b) => b.temp > a.temp ? b : a, projectors[0])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* ── SIDEBAR ── */}
      <aside className="flex flex-col h-full flex-shrink-0" style={{ width: 240, background: 'var(--card)', borderRight: '1px solid var(--border)' }}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--primary-foreground)" strokeWidth="2.5">
              <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--foreground)', letterSpacing: '-0.02em' }}>MikMaster</span>
        </div>

        {/* Project info */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="font-mono text-xs mb-1" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.08em' }}>PROJECT</p>
          <p className="text-sm font-semibold leading-tight mb-0.5" style={{ color: 'var(--foreground)' }}>{project.name}</p>
          <p className="text-xs leading-tight" style={{ color: 'var(--muted-foreground)' }}>{project.venue}</p>
        </div>

        {/* Booth tree */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* All filter */}
          <button
            onClick={() => setActiveBooth('all')}
            className="w-full flex items-center justify-between px-4 py-2 text-left transition-colors"
            style={{ background: activeBooth === 'all' ? 'rgba(245,158,11,0.08)' : 'transparent', borderLeft: activeBooth === 'all' ? '2px solid var(--primary)' : '2px solid transparent', border: 'none', cursor: 'pointer' }}
          >
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: activeBooth === 'all' ? 'var(--primary)' : 'var(--muted-foreground)' }}>
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
              <span className="text-xs font-medium" style={{ color: activeBooth === 'all' ? 'var(--primary)' : 'var(--foreground)' }}>All Projectors</span>
            </div>
            <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>{projectors.length}</span>
          </button>

          <div className="mx-4 my-2 h-px" style={{ background: 'var(--border)' }} />

          {booths.map(booth => {
            const bProjs = projectors.filter(p => p.boothId === booth.id)
            const bOnline = bProjs.filter(p => p.power === 'on').length
            const bErrors = bProjs.filter(p => p.errors.length > 0).length
            const expanded = expandedBooths.has(booth.id)
            const isActive = activeBooth === booth.id

            return (
              <div key={booth.id}>
                {/* Booth row */}
                <div
                  className="flex items-center px-3 py-2 cursor-pointer transition-colors"
                  style={{ borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent', background: isActive ? 'rgba(245,158,11,0.06)' : 'transparent' }}
                  onClick={() => { setActiveBooth(booth.id); toggleBooth(booth.id) }}
                >
                  <button
                    onClick={e => { e.stopPropagation(); toggleBooth(booth.id) }}
                    className="w-4 h-4 flex items-center justify-center flex-shrink-0 mr-1"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', transition: 'transform 0.15s', transform: expanded ? 'rotate(90deg)' : 'none' }}
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold truncate" style={{ color: isActive ? 'var(--primary)' : 'var(--foreground)' }}>{booth.name}</span>
                      {bErrors > 0 && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#EF4444' }} />}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{booth.location}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>{bProjs.length}</span>
                    <span className="font-mono text-xs" style={{ color: '#22C55E', fontSize: 9 }}>{bOnline}↑</span>
                  </div>
                </div>

                {/* Booth quick controls */}
                {expanded && (
                  <div className="flex gap-1 px-4 pb-1">
                    <button onClick={() => boothPowerAll(booth.id, 'on')} className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)', cursor: 'pointer', fontSize: 9 }}>ALL ON</button>
                    <button onClick={() => boothPowerAll(booth.id, 'off')} className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(100,116,139,0.1)', color: 'var(--muted-foreground)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 9 }}>ALL OFF</button>
                    <button onClick={() => boothShutterAll(booth.id, true)} className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)', cursor: 'pointer', fontSize: 9 }}>SHUTTER</button>
                  </div>
                )}

                {/* Projector rows */}
                {expanded && bProjs.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onSelect(p.id)}
                    className="w-full flex items-center gap-2 px-4 py-1.5 text-left transition-colors"
                    style={{ background: 'none', border: 'none', borderLeft: '2px solid transparent', cursor: 'pointer' }}
                  >
                    <StatusDot power={p.power} />
                    <span className="flex-1 text-xs truncate" style={{ color: 'var(--card-foreground)' }}>{p.name}</span>
                    {p.errors.length > 0 && <span style={{ color: '#EF4444', fontSize: 10 }}>⚠</span>}
                    <span className="font-mono" style={{ color: 'var(--muted-foreground)', fontSize: 9 }}>{p.ip.split('.')[3]}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>

        {/* Sidebar footer */}
        <div className="px-4 py-3 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          <button className="font-mono text-xs py-1.5 rounded flex items-center justify-center gap-1.5" style={{ background: 'var(--secondary)', color: 'var(--secondary-foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
            SAVE PROJECT
          </button>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full status-on flex-shrink-0" style={{ background: '#22C55E' }} />
            <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>192.168.10.x</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN PANEL ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(7,9,12,0.95)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.05em' }}>
              {activeBooth === 'all' ? 'ALL PROJECTORS' : booths.find(b => b.id === activeBooth)?.name.toUpperCase()} — {filtered.length} UNITS
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full status-on" style={{ background: '#22C55E', display: 'inline-block' }} />
              <span className="font-mono text-xs" style={{ color: '#22C55E' }}>{online}/{projectors.length} ONLINE</span>
            </div>
            {errors > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#EF4444', display: 'inline-block' }} />
                <span className="font-mono text-xs" style={{ color: '#EF4444' }}>{errors} ALERT{errors > 1 ? 'S' : ''}</span>
              </div>
            )}
            <div className="w-px h-4" style={{ background: 'var(--border)' }} />
            <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </header>

        {/* Fleet metrics strip */}
        <div className="flex items-center gap-4 px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
          {/* Fleet health */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <FleetHealthGauge online={online} total={projectors.length} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono font-bold" style={{ color: 'var(--foreground)', fontSize: 11 }}>{projectors.length === 0 ? '—' : Math.round(online / projectors.length * 100)}%</span>
              </div>
            </div>
            <div>
              <p className="font-mono text-xs font-medium" style={{ color: 'var(--foreground)' }}>{online}/{projectors.length} Operational</p>
              <p className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>Fleet Health</p>
            </div>
          </div>

          <div className="w-px h-10" style={{ background: 'var(--border)' }} />

          {/* Alerts */}
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-lg font-bold leading-none" style={{ color: errors > 0 ? '#EF4444' : '#22C55E' }}>{errors}</span>
            <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>Active Alerts</span>
          </div>

          <div className="w-px h-10" style={{ background: 'var(--border)' }} />

          {/* Avg temp */}
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-lg font-bold leading-none" style={{ color: avgTemp > 65 ? '#EF4444' : avgTemp > 50 ? '#F59E0B' : 'var(--foreground)' }}>
              {avgTemp > 0 ? `${avgTemp}°C` : '—'}
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>Avg Temperature</span>
          </div>

          <div className="w-px h-10" style={{ background: 'var(--border)' }} />

          {/* Temp chart */}
          <div className="flex flex-col gap-1">
            <TempChart projectors={projectors} />
            <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Hottest: {hottestUnit?.name} {hottestUnit?.temp}°C
            </span>
          </div>

          <div className="w-px h-10" style={{ background: 'var(--border)' }} />

          {/* Total lamp hours */}
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-lg font-bold leading-none" style={{ color: 'var(--foreground)' }}>
              {projectors.reduce((s, p) => s + p.lampHours, 0).toLocaleString()}h
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>Total Lamp Hours</span>
          </div>

          {/* Bulk actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => allPower('on')} className="font-mono text-xs px-3 py-1.5 rounded flex items-center gap-1.5" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)', cursor: 'pointer' }}>
              ALL ON
            </button>
            <button onClick={() => allPower('off')} className="font-mono text-xs px-3 py-1.5 rounded flex items-center gap-1.5" style={{ background: 'var(--card)', color: 'var(--muted-foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              ALL OFF
            </button>
            <div className="w-px h-4" style={{ background: 'var(--border)' }} />
            <button onClick={() => allShutter(true)} className="font-mono text-xs px-3 py-1.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)', cursor: 'pointer' }}>
              SHUTTER ALL
            </button>
            <button onClick={() => allShutter(false)} className="font-mono text-xs px-3 py-1.5 rounded" style={{ background: 'var(--card)', color: 'var(--muted-foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              UNSHUTTER
            </button>
          </div>
        </div>

        {/* Booth filter tabs */}
        <div className="flex items-center gap-1 px-5 py-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          {[{ id: 'all', name: 'All' }, ...booths].map(b => (
            <button
              key={b.id}
              onClick={() => setActiveBooth(b.id)}
              className="font-mono text-xs px-3 py-1 rounded transition-all"
              style={{
                background: activeBooth === b.id ? 'var(--primary)' : 'transparent',
                color: activeBooth === b.id ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                border: `1px solid ${activeBooth === b.id ? 'var(--primary)' : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              {b.name}
              <span className="ml-1.5" style={{ opacity: 0.7 }}>
                {b.id === 'all' ? projectors.length : projectors.filter(p => p.boothId === b.id).length}
              </span>
            </button>
          ))}
        </div>

        {/* Projector grid */}
        <main className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <span className="font-mono text-sm" style={{ color: 'var(--muted-foreground)' }}>No projectors in this booth</span>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {filtered.map(proj => (
                <ProjectorCard
                  key={proj.id}
                  proj={proj}
                  onSelect={() => onSelect(proj.id)}
                  onPowerToggle={() => onUpdate(proj.id, { power: proj.power === 'on' ? 'off' : 'on', brightness: proj.power === 'on' ? 0 : 85 })}
                  onShutterToggle={() => onUpdate(proj.id, { shutter: !proj.shutter })}
                />
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="px-5 py-2 flex items-center justify-between flex-shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--muted)' }}>
          <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>MikMaster v3.1.0 — PJLink Class 2</span>
          <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </footer>
      </div>
    </div>
  )
}

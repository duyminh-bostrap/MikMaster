import { useState, useEffect, useRef } from 'react'
import type { Projector, Booth, Project } from '../types'

const MOCK_BOOTHS: Booth[] = [
  { id: 'booth-a', name: 'Main Stage', location: 'FOH Zone' },
  { id: 'booth-b', name: 'LED Wall Zone', location: 'Downstage Floor' },
  { id: 'booth-c', name: 'Rear Screen', location: 'Upstage Truss' },
]

const MOCK_FOUND: Omit<Projector, 'id'>[] = [
  {
    boothId: 'booth-a', name: 'Stage Left', location: 'FOH Truss L', ip: '192.168.10.21',
    power: 'on', shutter: false, input: 'HDMI 1', temp: 62, lampHours: 1240, brightness: 85,
    errors: [], model: 'Christie Crimson WU25',
    lensPresets: [
      { slot: 1, name: 'Main Show', shiftX: 0, shiftY: 5, zoom: 85, focus: 72, savedAt: '2026-09-28 18:34' },
      { slot: 2, name: 'Rehearsal', shiftX: 0, shiftY: 0, zoom: 80, focus: 70, savedAt: '2026-09-27 14:10' },
      null, null,
    ],
    activeLensPreset: 1, lensShiftX: 0, lensShiftY: 5, lensZoom: 85, lensFocus: 72,
  },
  {
    boothId: 'booth-a', name: 'Stage Right', location: 'FOH Truss R', ip: '192.168.10.22',
    power: 'on', shutter: false, input: 'HDMI 2', temp: 58, lampHours: 1238, brightness: 85,
    errors: [], model: 'Christie Crimson WU25',
    lensPresets: [
      { slot: 1, name: 'Main Show', shiftX: 0, shiftY: 5, zoom: 85, focus: 72, savedAt: '2026-09-28 18:34' },
      null, null, null,
    ],
    activeLensPreset: 1, lensShiftX: 0, lensShiftY: 5, lensZoom: 85, lensFocus: 72,
  },
  {
    boothId: 'booth-a', name: 'Center Fill', location: 'Mid Truss C', ip: '192.168.10.23',
    power: 'on', shutter: true, input: 'SDI 1', temp: 71, lampHours: 3102, brightness: 100,
    errors: ['High Temp'], model: 'Barco UDX-4K32',
    lensPresets: [null, null, null, null],
    activeLensPreset: null, lensShiftX: 0, lensShiftY: 0, lensZoom: 90, lensFocus: 68,
  },
  {
    boothId: 'booth-b', name: 'LED Wall A', location: 'DS Floor Left', ip: '192.168.10.41',
    power: 'on', shutter: false, input: 'DisplayPort', temp: 45, lampHours: 210, brightness: 70,
    errors: [], model: 'Sony VPL-GTZ380',
    lensPresets: [
      { slot: 1, name: 'Wide', shiftX: -10, shiftY: 0, zoom: 60, focus: 80, savedAt: '2026-09-29 09:00' },
      null, null, null,
    ],
    activeLensPreset: null, lensShiftX: -10, lensShiftY: 0, lensZoom: 60, lensFocus: 80,
  },
  {
    boothId: 'booth-b', name: 'LED Wall B', location: 'DS Floor Right', ip: '192.168.10.42',
    power: 'standby', shutter: false, input: 'DisplayPort', temp: 31, lampHours: 208, brightness: 0,
    errors: ['No Signal'], model: 'Sony VPL-GTZ380',
    lensPresets: [null, null, null, null],
    activeLensPreset: null, lensShiftX: 0, lensShiftY: 0, lensZoom: 60, lensFocus: 75,
  },
  {
    boothId: 'booth-c', name: 'Rear Blend', location: 'Upstage Truss', ip: '192.168.10.30',
    power: 'off', shutter: false, input: 'HDBaseT', temp: 24, lampHours: 890, brightness: 0,
    errors: [], model: 'Epson EB-L1755U',
    lensPresets: [null, null, null, null],
    activeLensPreset: null, lensShiftX: 0, lensShiftY: 0, lensZoom: 75, lensFocus: 65,
  },
]

const SAVED_PROJECTS = [
  { id: 'sp-1', name: 'Grand Tech Summit 2026', venue: 'Hanoi National Convention Centre', date: '2026-09-26', devices: 6 },
  { id: 'sp-2', name: 'CES Asia Booth Setup', venue: 'SECC Ho Chi Minh City', date: '2026-09-12', devices: 12 },
  { id: 'sp-3', name: 'Brand Launch — Vinfast', venue: 'Opera House, Hanoi', date: '2026-08-30', devices: 4 },
]

const SUBNET = '192.168.10'

interface StartScreenProps {
  onLaunch: (project: Project, booths: Booth[], projectors: Projector[]) => void
}

type Mode = 'choose' | 'new' | 'load'
type ScanState = 'idle' | 'scanning' | 'done'

export default function StartScreen({ onLaunch }: StartScreenProps) {
  const [mode, setMode] = useState<Mode>('choose')
  const [projectName, setProjectName] = useState('')
  const [projectVenue, setProjectVenue] = useState('')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [progress, setProgress] = useState(0)
  const [currentIp, setCurrentIp] = useState('')
  const [found, setFound] = useState<Projector[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [manualIp, setManualIp] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualError, setManualError] = useState('')
  const [time, setTime] = useState(new Date())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  function startScan() {
    setScanState('scanning')
    setProgress(0)
    setFound([])
    setSelected(new Set())
    let tick = 0
    const totalTicks = 80
    const foundAt = [10, 20, 35, 50, 62, 72]
    let fi = 0
    intervalRef.current = setInterval(() => {
      tick++
      const pct = Math.round((tick / totalTicks) * 100)
      setProgress(pct)
      setCurrentIp(`${SUBNET}.${Math.floor((tick / totalTicks) * 254)}`)
      if (fi < foundAt.length && tick >= foundAt[fi]) {
        const proj: Projector = { ...MOCK_FOUND[fi], id: `PJ-0${fi + 1}` }
        setFound(prev => [...prev, proj])
        setSelected(s => new Set([...s, proj.id]))
        fi++
      }
      if (tick >= totalTicks) {
        clearInterval(intervalRef.current!)
        setScanState('done')
      }
    }, 60)
  }

  function addManual() {
    const ip = manualIp.trim()
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
      setManualError('Invalid IP address format')
      return
    }
    if (found.some(p => p.ip === ip)) {
      setManualError('This IP is already in the list')
      return
    }
    const proj: Projector = {
      id: `PJ-M${found.length + 1}`, boothId: 'booth-a',
      name: manualName.trim() || `Projector ${ip}`, location: 'Manual',
      ip, power: 'standby', shutter: false, input: 'HDMI 1',
      temp: 0, lampHours: 0, brightness: 0, errors: [], model: 'Unknown',
      lensPresets: [null, null, null, null],
      activeLensPreset: null, lensShiftX: 0, lensShiftY: 0, lensZoom: 75, lensFocus: 70,
    }
    setFound(prev => [...prev, proj])
    setSelected(s => new Set([...s, proj.id]))
    setManualIp('')
    setManualName('')
    setManualError('')
  }

  function proceed() {
    const chosen = found.filter(p => selected.has(p.id))
    const project: Project = {
      id: `proj-${Date.now()}`,
      name: projectName.trim() || 'New Project',
      venue: projectVenue.trim() || 'Unspecified Venue',
      createdAt: new Date().toISOString(),
    }
    onLaunch(project, MOCK_BOOTHS, chosen)
  }

  function loadProject(savedId: string) {
    const sp = SAVED_PROJECTS.find(p => p.id === savedId)
    if (!sp) return
    const project: Project = {
      id: sp.id, name: sp.name, venue: sp.venue,
      createdAt: new Date(sp.date).toISOString(),
    }
    const projectors = MOCK_FOUND.slice(0, sp.devices).map((m, i) => ({
      ...m, id: `PJ-0${i + 1}`,
    }))
    onLaunch(project, MOCK_BOOTHS, projectors)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(7,9,12,0.98)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: 'var(--primary)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-foreground)" strokeWidth="2.5">
                <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <span className="font-semibold text-base tracking-tight" style={{ color: 'var(--foreground)', letterSpacing: '-0.02em' }}>MikMaster</span>
          </div>
          <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}>
            v3.1.0
          </span>
        </div>
        <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {time.toLocaleTimeString('en-US', { hour12: false })}
        </span>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        {/* ── CHOOSE MODE ── */}
        {mode === 'choose' && (
          <div className="w-full max-w-2xl flex flex-col items-center gap-8">
            <div className="text-center">
              <p className="font-mono text-xs mb-3" style={{ color: 'var(--accent)', letterSpacing: '0.2em' }}>AV CONTROL SYSTEM</p>
              <h1 className="text-3xl font-semibold tracking-tight mb-3" style={{ color: 'var(--foreground)', letterSpacing: '-0.03em' }}>
                Start a Session
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)', maxWidth: 440, margin: '0 auto' }}>
                Create a new project or load a saved configuration to resume controlling your projector fleet.
              </p>
            </div>

            <div className="grid gap-4 w-full" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {/* New Project card */}
              <button
                onClick={() => setMode('new')}
                className="flex flex-col items-start p-6 rounded text-left transition-all group"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                <div className="w-10 h-10 rounded flex items-center justify-center mb-4" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <span className="font-mono text-xs mb-1" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.1em' }}>NEW PROJECT</span>
                <span className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Create &amp; Scan</span>
                <span className="text-xs" style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                  Set up a fresh project, scan your network for PJLink devices, and configure your booth layout.
                </span>
                <span className="font-mono text-xs mt-4" style={{ color: 'var(--primary)' }}>
                  Start from scratch →
                </span>
              </button>

              {/* Load Project card */}
              <button
                onClick={() => setMode('load')}
                className="flex flex-col items-start p-6 rounded text-left transition-all"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                <div className="w-10 h-10 rounded flex items-center justify-center mb-4" style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <span className="font-mono text-xs mb-1" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.1em' }}>LOAD PROJECT</span>
                <span className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Resume Session</span>
                <span className="text-xs" style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                  Restore a previously saved project including IP list, booth configuration, and all lens presets.
                </span>
                <span className="font-mono text-xs mt-4" style={{ color: 'var(--accent)' }}>
                  {SAVED_PROJECTS.length} saved projects →
                </span>
              </button>
            </div>

            <p className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>
              PJLink Class 2 · TCP 4352 · MD5 Auth
            </p>
          </div>
        )}

        {/* ── LOAD PROJECT ── */}
        {mode === 'load' && (
          <div className="w-full max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setMode('choose')}
                className="font-mono text-xs flex items-center gap-1.5 transition-colors"
                style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                </svg>
                BACK
              </button>
              <div className="w-px h-4" style={{ background: 'var(--border)' }} />
              <h1 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>Load Project</h1>
            </div>

            <div className="flex flex-col gap-3">
              {SAVED_PROJECTS.map(sp => (
                <button
                  key={sp.id}
                  onClick={() => loadProject(sp.id)}
                  className="flex items-center justify-between p-4 rounded text-left transition-all"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{sp.name}</span>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{sp.venue}</span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{sp.devices} devices</span>
                      <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>Saved {sp.date}</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs" style={{ color: 'var(--primary)' }}>LOAD →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── NEW PROJECT / SCAN ── */}
        {mode === 'new' && (
          <div className="w-full max-w-5xl">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => { setMode('choose'); setScanState('idle'); setFound([]); setSelected(new Set()) }}
                className="font-mono text-xs flex items-center gap-1.5"
                style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                </svg>
                BACK
              </button>
              <div className="w-px h-4" style={{ background: 'var(--border)' }} />
              <h1 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>New Project</h1>
              {found.length > 0 && (
                <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--accent)', border: '1px solid rgba(6,182,212,0.2)' }}>
                  {found.length} found · {selected.size} selected
                </span>
              )}
            </div>

            <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 320px' }}>
              {/* Left: project info + scan */}
              <div className="flex flex-col gap-4">
                {/* Project details */}
                <div className="rounded overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="font-mono text-xs font-medium" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.08em' }}>PROJECT DETAILS</span>
                  </div>
                  <div className="p-4 grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>PROJECT NAME</label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={e => setProjectName(e.target.value)}
                        placeholder="e.g. Grand Tech Summit 2026"
                        className="font-mono text-sm px-3 py-2 rounded outline-none"
                        style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)', width: '100%' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>VENUE</label>
                      <input
                        type="text"
                        value={projectVenue}
                        onChange={e => setProjectVenue(e.target.value)}
                        placeholder="e.g. Hanoi Convention Centre"
                        className="font-mono text-sm px-3 py-2 rounded outline-none"
                        style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)', width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Scan panel */}
                <div className="rounded overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="font-mono text-xs font-medium" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.08em' }}>
                      AUTO SCAN — {SUBNET}.0/24
                    </span>
                    {scanState === 'scanning' && <span className="font-mono text-xs status-on" style={{ color: '#22C55E' }}>● SCANNING</span>}
                    {scanState === 'done' && <span className="font-mono text-xs" style={{ color: '#22C55E' }}>✓ COMPLETE — {found.length} devices</span>}
                  </div>
                  <div className="p-4">
                    {scanState === 'idle' ? (
                      <div className="flex flex-col items-center py-6 gap-4">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                          </svg>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Ready — Subnet: {SUBNET}.1 – {SUBNET}.254</p>
                        <button
                          onClick={startScan}
                          className="font-mono text-xs px-5 py-2.5 rounded font-medium flex items-center gap-2"
                          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', cursor: 'pointer' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49" />
                          </svg>
                          START NETWORK SCAN
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div>
                          <div className="flex justify-between mb-1.5">
                            <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>
                              {scanState === 'scanning' ? `Probing ${currentIp}…` : 'Scan complete'}
                            </span>
                            <span className="font-mono text-xs" style={{ color: 'var(--primary)' }}>{progress}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                            <div className="h-full rounded-full transition-all duration-100" style={{ width: `${progress}%`, background: scanState === 'done' ? '#22C55E' : 'var(--primary)' }} />
                          </div>
                        </div>
                        {/* Network grid */}
                        <div className="rounded p-3" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                          <div className="flex flex-wrap gap-0.5">
                            {Array.from({ length: 60 }).map((_, i) => {
                              const ipNum = Math.round((i / 60) * 254)
                              const scanned = progress >= Math.round((i / 60) * 100)
                              const isFound = MOCK_FOUND.some(m => parseInt(m.ip.split('.')[3]) === ipNum + 1)
                              return (
                                <div key={i} className="rounded-sm transition-all duration-200" style={{
                                  width: 10, height: 10,
                                  background: scanned && isFound ? 'var(--accent)' : scanned ? '#1E2A3A' : '#0D1117',
                                  boxShadow: scanned && isFound ? '0 0 4px rgba(6,182,212,0.4)' : 'none',
                                }} />
                              )
                            })}
                          </div>
                          <p className="font-mono text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                            <span style={{ color: 'var(--accent)' }}>■</span> device found &nbsp; ■ scanned
                          </p>
                        </div>
                        {scanState === 'done' && (
                          <button onClick={startScan} className="font-mono text-xs px-3 py-1.5 rounded self-start" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                            ↺ RESCAN
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Found devices */}
                {found.length > 0 && (
                  <div className="rounded overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="font-mono text-xs font-medium" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.08em' }}>DISCOVERED DEVICES</span>
                      <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{selected.size}/{found.length} SELECTED</span>
                    </div>
                    {found.map((proj, i) => (
                      <div
                        key={proj.id}
                        className="flex items-center px-4 py-3 cursor-pointer transition-colors"
                        style={{ borderBottom: i < found.length - 1 ? '1px solid var(--border)' : 'none', background: selected.has(proj.id) ? 'rgba(245,158,11,0.04)' : 'transparent' }}
                        onClick={() => setSelected(prev => { const n = new Set(prev); n.has(proj.id) ? n.delete(proj.id) : n.add(proj.id); return n })}
                      >
                        <div className="w-4 h-4 rounded mr-3 flex-shrink-0 flex items-center justify-center transition-all" style={{ background: selected.has(proj.id) ? 'var(--primary)' : 'transparent', border: `1px solid ${selected.has(proj.id) ? 'var(--primary)' : 'var(--border)'}` }}>
                          {selected.has(proj.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--primary-foreground)" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{proj.name}</span>
                            {proj.errors.length > 0 && <span className="font-mono text-xs px-1 py-0.5 rounded" style={{ background: '#EF444415', color: '#EF4444', border: '1px solid #EF444430' }}>{proj.errors[0]}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{proj.ip}</span>
                            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{proj.model}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <div className="w-2 h-2 rounded-full" style={{ background: proj.power === 'on' ? '#22C55E' : proj.power === 'standby' ? '#F59E0B' : '#374151' }} />
                          <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>{proj.power}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Manual add + proceed */}
              <div className="flex flex-col gap-4">
                {/* Manual add */}
                <div className="rounded overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="font-mono text-xs font-medium" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.08em' }}>MANUAL ADD</span>
                  </div>
                  <div className="p-4 flex flex-col gap-3">
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                      Add a device not detected by scan (different subnet or ping-blocked).
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>IP ADDRESS</label>
                      <input
                        type="text" value={manualIp} onChange={e => { setManualIp(e.target.value); setManualError('') }}
                        placeholder="192.168.1.100" onKeyDown={e => e.key === 'Enter' && addManual()}
                        className="font-mono text-sm px-3 py-2 rounded outline-none"
                        style={{ background: 'var(--muted)', border: `1px solid ${manualError ? '#EF444460' : 'var(--border)'}`, color: 'var(--foreground)', width: '100%' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>DISPLAY NAME (opt.)</label>
                      <input
                        type="text" value={manualName} onChange={e => setManualName(e.target.value)}
                        placeholder="e.g. Backup Unit" onKeyDown={e => e.key === 'Enter' && addManual()}
                        className="font-mono text-sm px-3 py-2 rounded outline-none"
                        style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--foreground)', width: '100%' }}
                      />
                    </div>
                    {manualError && <p className="font-mono text-xs" style={{ color: '#EF4444' }}>{manualError}</p>}
                    <button onClick={addManual} className="font-mono text-xs py-2 rounded font-medium flex items-center justify-center gap-2" style={{ background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      ADD DEVICE
                    </button>
                  </div>
                </div>

                {/* Protocol info */}
                <div className="rounded p-4" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                  <p className="font-mono text-xs mb-2" style={{ color: 'var(--accent)', letterSpacing: '0.08em' }}>PROTOCOL</p>
                  {[['Standard', 'PJLink Class 2'], ['Port', '4352 TCP'], ['Auth', 'MD5 Challenge'], ['Subnet', `${SUBNET}.0/24`]].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-0.5">
                      <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>{k}</span>
                      <span className="font-mono text-xs" style={{ color: 'var(--foreground)' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Proceed */}
                <button
                  onClick={proceed}
                  disabled={selected.size === 0}
                  className="font-mono text-sm py-3 rounded font-semibold flex items-center justify-center gap-2"
                  style={{ background: selected.size > 0 ? 'var(--primary)' : 'var(--muted)', color: selected.size > 0 ? 'var(--primary-foreground)' : 'var(--muted-foreground)', border: 'none', cursor: selected.size > 0 ? 'pointer' : 'not-allowed', letterSpacing: '0.04em' }}
                >
                  {selected.size > 0 ? `LAUNCH — ${selected.size} DEVICE${selected.size > 1 ? 'S' : ''}` : 'SELECT DEVICES FIRST'}
                  {selected.size > 0 && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="px-6 py-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)', background: 'var(--muted)' }}>
        <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>MikMaster v3.1.0 — Professional AV Control</span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E', display: 'inline-block' }} />
          <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>Network: eth0 ready</span>
        </div>
      </footer>
    </div>
  )
}

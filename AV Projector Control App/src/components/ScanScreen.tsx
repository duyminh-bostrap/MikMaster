import { useState, useEffect, useRef } from 'react'
import type { Projector } from '../types'

const SUBNET = '192.168.10'
const DEFAULT_LENS = { lensPresets: [null, null, null, null] as (import('../types').LensPreset | null)[], activeLensPreset: null, lensShiftX: 0, lensShiftY: 0, lensZoom: 75, lensFocus: 70 }
const MOCK_FOUND: Omit<Projector, 'id'>[] = [
  { boothId: 'booth-a', name: 'Stage Left', location: 'FOH Truss L', ip: '192.168.10.21', power: 'on', shutter: false, input: 'HDMI 1', temp: 62, lampHours: 1240, brightness: 85, errors: [], model: 'Christie Crimson WU25', ...DEFAULT_LENS },
  { boothId: 'booth-a', name: 'Stage Right', location: 'FOH Truss R', ip: '192.168.10.22', power: 'on', shutter: false, input: 'HDMI 2', temp: 58, lampHours: 1238, brightness: 85, errors: [], model: 'Christie Crimson WU25', ...DEFAULT_LENS },
  { boothId: 'booth-a', name: 'Center Fill', location: 'Mid Truss C', ip: '192.168.10.23', power: 'on', shutter: true, input: 'SDI 1', temp: 71, lampHours: 3102, brightness: 100, errors: ['High Temp'], model: 'Barco UDX-4K32', ...DEFAULT_LENS },
  { boothId: 'booth-c', name: 'Rear Blend', location: 'Rear Truss', ip: '192.168.10.30', power: 'off', shutter: false, input: 'HDBaseT', temp: 24, lampHours: 890, brightness: 0, errors: [], model: 'Epson EB-L1755U', ...DEFAULT_LENS },
  { boothId: 'booth-b', name: 'LED Wall A', location: 'DS Floor', ip: '192.168.10.41', power: 'on', shutter: false, input: 'DisplayPort', temp: 45, lampHours: 210, brightness: 70, errors: [], model: 'Sony VPL-GTZ380', ...DEFAULT_LENS },
  { boothId: 'booth-b', name: 'LED Wall B', location: 'DS Floor', ip: '192.168.10.42', power: 'standby', shutter: false, input: 'DisplayPort', temp: 31, lampHours: 208, brightness: 0, errors: ['No Signal'], model: 'Sony VPL-GTZ380', ...DEFAULT_LENS },
]

interface ScanScreenProps {
  onComplete: (projectors: Projector[]) => void
}

type ScanState = 'idle' | 'scanning' | 'done'

export default function ScanScreen({ onComplete }: ScanScreenProps) {
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [progress, setProgress] = useState(0)
  const [currentIp, setCurrentIp] = useState('')
  const [found, setFound] = useState<Projector[]>([])
  const [manualIp, setManualIp] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualError, setManualError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
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
    const foundAt = [12, 22, 38, 51, 63, 70]
    let foundIdx = 0

    intervalRef.current = setInterval(() => {
      tick++
      const pct = Math.round((tick / totalTicks) * 100)
      setProgress(pct)
      const ip = `${SUBNET}.${Math.floor((tick / totalTicks) * 254)}`
      setCurrentIp(ip)

      if (foundIdx < foundAt.length && tick >= foundAt[foundIdx]) {
        const proj: Projector = {
          ...MOCK_FOUND[foundIdx],
          id: `PJ-0${foundIdx + 1}`,
        }
        setFound(prev => {
          const next = [...prev, proj]
          setSelected(s => new Set([...s, proj.id]))
          return next
        })
        foundIdx++
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
      name: manualName.trim() || `Projector ${ip}`,
      location: 'Manual', ip, power: 'standby', shutter: false, input: 'HDMI 1',
      temp: 0, lampHours: 0, brightness: 0, errors: [], model: 'Unknown',
      lensPresets: [null, null, null, null], activeLensPreset: null,
      lensShiftX: 0, lensShiftY: 0, lensZoom: 75, lensFocus: 70,
    }
    setFound(prev => [...prev, proj])
    setSelected(s => new Set([...s, proj.id]))
    setManualIp('')
    setManualName('')
    setManualError('')
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function proceed() {
    const chosen = found.filter(p => selected.has(p.id))
    onComplete(chosen)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'rgba(7,9,12,0.98)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary-foreground)" strokeWidth="2.5">
              <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--foreground)' }}>ProjectorOS</span>
          <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}>
            DEVICE DISCOVERY
          </span>
        </div>
        <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {time.toLocaleTimeString('en-US', { hour12: false })}
        </span>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-5xl">
          {/* Title */}
          <div className="mb-8">
            <p className="font-mono text-xs mb-1" style={{ color: 'var(--accent)', letterSpacing: '0.15em' }}>STEP 1 OF 2</p>
            <h1 className="text-2xl font-semibold tracking-tight mb-1" style={{ color: 'var(--foreground)' }}>
              Network Device Discovery
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Scan your local network for PJLink-compatible projectors or add devices manually by IP address.
            </p>
          </div>

          <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 340px' }}>
            {/* Left: scan area */}
            <div className="flex flex-col gap-4">
              {/* Scan panel */}
              <div className="rounded overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="font-mono text-xs font-medium" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.08em' }}>
                    AUTO SCAN — {SUBNET}.0/24
                  </span>
                  {scanState === 'scanning' && (
                    <span className="font-mono text-xs status-on" style={{ color: '#22C55E' }}>● SCANNING</span>
                  )}
                  {scanState === 'done' && (
                    <span className="font-mono text-xs" style={{ color: '#22C55E' }}>✓ COMPLETE</span>
                  )}
                </div>

                <div className="p-4">
                  {scanState === 'idle' ? (
                    <div className="flex flex-col items-center py-8 gap-4">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>Ready to scan</p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Subnet: {SUBNET}.1 — {SUBNET}.254</p>
                      </div>
                      <button
                        onClick={startScan}
                        className="font-mono text-xs px-5 py-2.5 rounded font-medium transition-all flex items-center gap-2"
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
                      {/* Progress bar */}
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>
                            {scanState === 'scanning' ? `Probing ${currentIp}…` : 'Scan complete'}
                          </span>
                          <span className="font-mono text-xs" style={{ color: 'var(--primary)' }}>{progress}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-100"
                            style={{ width: `${progress}%`, background: scanState === 'done' ? '#22C55E' : 'var(--primary)' }}
                          />
                        </div>
                      </div>

                      {/* Network grid visualization */}
                      <div className="rounded p-3" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                        <div className="flex flex-wrap gap-0.5">
                          {Array.from({ length: 60 }).map((_, i) => {
                            const ipNum = Math.round((i / 60) * 254)
                            const scanned = progress >= Math.round((i / 60) * 100)
                            const foundIp = MOCK_FOUND.some(m => parseInt(m.ip.split('.')[3]) === ipNum + 1)
                            return (
                              <div
                                key={i}
                                className="rounded-sm transition-all duration-200"
                                style={{
                                  width: 10, height: 10,
                                  background: scanned && foundIp ? 'var(--accent)' : scanned ? '#1E2A3A' : '#0D1117',
                                  border: `1px solid ${scanned && foundIp ? 'var(--accent)' : 'transparent'}`,
                                  boxShadow: scanned && foundIp ? '0 0 4px rgba(6,182,212,0.4)' : 'none',
                                }}
                              />
                            )
                          })}
                        </div>
                        <p className="font-mono text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                          <span style={{ color: 'var(--accent)' }}>■</span> = device found &nbsp;
                          <span style={{ color: '#1E2A3A', border: '1px solid var(--border)', display: 'inline-block', width: 10, height: 10, verticalAlign: 'middle' }} /> = scanned empty
                        </p>
                      </div>

                      {scanState === 'done' && (
                        <button
                          onClick={startScan}
                          className="font-mono text-xs px-3 py-1.5 rounded self-start"
                          style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}
                        >
                          ↺ RESCAN
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Found devices list */}
              {found.length > 0 && (
                <div className="rounded overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="font-mono text-xs font-medium" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.08em' }}>
                      DISCOVERED DEVICES
                    </span>
                    <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>
                      {found.length} FOUND · {selected.size} SELECTED
                    </span>
                  </div>
                  <div>
                    {found.map((proj, i) => (
                      <div
                        key={proj.id}
                        className="flex items-center px-4 py-3 cursor-pointer transition-colors"
                        style={{
                          borderBottom: i < found.length - 1 ? '1px solid var(--border)' : 'none',
                          background: selected.has(proj.id) ? 'rgba(245,158,11,0.04)' : 'transparent',
                        }}
                        onClick={() => toggleSelect(proj.id)}
                      >
                        <div
                          className="w-4 h-4 rounded mr-3 flex items-center justify-center flex-shrink-0 transition-all"
                          style={{
                            background: selected.has(proj.id) ? 'var(--primary)' : 'transparent',
                            border: `1px solid ${selected.has(proj.id) ? 'var(--primary)' : 'var(--border)'}`,
                          }}
                        >
                          {selected.has(proj.id) && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--primary-foreground)" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{proj.name}</span>
                            {proj.errors.length > 0 && (
                              <span className="font-mono text-xs px-1 py-0.5 rounded" style={{ background: '#EF444415', color: '#EF4444', border: '1px solid #EF444430' }}>
                                {proj.errors[0]}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{proj.ip}</span>
                            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{proj.model}</span>
                            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{proj.location}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-3">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              background: proj.power === 'on' ? '#22C55E' : proj.power === 'standby' ? '#F59E0B' : '#374151',
                            }}
                          />
                          <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                            {proj.power}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: manual add + proceed */}
            <div className="flex flex-col gap-4">
              {/* Manual add */}
              <div className="rounded overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="font-mono text-xs font-medium" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.08em' }}>
                    MANUAL ADD
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                    Add a projector that wasn't detected by the auto-scan (e.g. different subnet, firewall-blocked ping).
                  </p>
                  <div className="flex flex-col gap-2">
                    <label className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>IP ADDRESS</label>
                    <input
                      type="text"
                      value={manualIp}
                      onChange={e => { setManualIp(e.target.value); setManualError('') }}
                      placeholder="192.168.1.100"
                      className="font-mono text-sm px-3 py-2 rounded outline-none transition-all"
                      style={{
                        background: 'var(--muted)',
                        border: `1px solid ${manualError ? '#EF444460' : 'var(--border)'}`,
                        color: 'var(--foreground)',
                        width: '100%',
                      }}
                      onKeyDown={e => e.key === 'Enter' && addManual()}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>DISPLAY NAME (optional)</label>
                    <input
                      type="text"
                      value={manualName}
                      onChange={e => setManualName(e.target.value)}
                      placeholder="e.g. Backup Projector"
                      className="font-mono text-sm px-3 py-2 rounded outline-none"
                      style={{
                        background: 'var(--muted)',
                        border: '1px solid var(--border)',
                        color: 'var(--foreground)',
                        width: '100%',
                      }}
                      onKeyDown={e => e.key === 'Enter' && addManual()}
                    />
                  </div>
                  {manualError && (
                    <p className="font-mono text-xs" style={{ color: '#EF4444' }}>{manualError}</p>
                  )}
                  <button
                    onClick={addManual}
                    className="font-mono text-xs py-2 rounded font-medium flex items-center justify-center gap-2 transition-all"
                    style={{ background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    ADD DEVICE
                  </button>
                </div>
              </div>

              {/* Info box */}
              <div className="rounded p-4" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                <p className="font-mono text-xs mb-2" style={{ color: 'var(--accent)', letterSpacing: '0.08em' }}>PROTOCOL INFO</p>
                <div className="flex flex-col gap-1.5">
                  {[['Protocol', 'PJLink Class 2'], ['Port', '4352 (TCP)'], ['Auth', 'MD5 Challenge'], ['Subnet', `${SUBNET}.0/24`]].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>{k}</span>
                      <span className="font-mono text-xs" style={{ color: 'var(--foreground)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proceed button */}
              <button
                onClick={proceed}
                disabled={selected.size === 0}
                className="font-mono text-sm py-3 rounded font-semibold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: selected.size > 0 ? 'var(--primary)' : 'var(--muted)',
                  color: selected.size > 0 ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  border: 'none',
                  cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
                  letterSpacing: '0.05em',
                }}
              >
                CONNECT {selected.size > 0 ? `${selected.size} DEVICE${selected.size > 1 ? 'S' : ''}` : '— SELECT DEVICES'}
                {selected.size > 0 && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>

              {selected.size === 0 && (
                <p className="font-mono text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
                  Scan or add devices to continue
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)', background: 'var(--muted)' }}>
        <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>v2.4.1 — ProjectorOS</span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E', display: 'inline-block' }} />
          <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>Network adapter: eth0</span>
        </div>
      </footer>
    </div>
  )
}

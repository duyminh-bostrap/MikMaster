import { useState } from 'react'
import type { Projector, Booth, Project, LensPreset } from '../types'

const INPUTS = ['HDMI 1', 'HDMI 2', 'SDI 1', 'SDI 2', 'HDBaseT', 'DisplayPort', 'DVI']

/* ── Shared micro-components ── */

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="font-mono text-xs font-medium" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.12em' }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  )
}



/* ── D-pad / joystick cross layouts ── */

function DPad({ onUp, onDown, onLeft, onRight, onCenter, centerLabel }: {
  onUp: () => void; onDown: () => void; onLeft: () => void; onRight: () => void
  onCenter: () => void; centerLabel: string
}) {
  const btn = (label: React.ReactNode, handler: () => void, gCol: number, gRow: number) => (
    <button
      onClick={handler}
      className="dpad-btn flex items-center justify-center font-mono text-xs"
      style={{ gridColumn: gCol, gridRow: gRow, borderRadius: 4 }}
    >
      {label}
    </button>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '44px 44px 44px', gridTemplateRows: '44px 44px 44px', gap: 4 }}>
      {btn(<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>, onUp, 2, 1)}
      {btn(<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>, onLeft, 1, 2)}
      <button onClick={onCenter} className="dpad-btn flex items-center justify-center font-mono" style={{ gridColumn: 2, gridRow: 2, borderRadius: 4, fontSize: 9, color: 'var(--primary)' }}>
        {centerLabel}
      </button>
      {btn(<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>, onRight, 3, 2)}
      {btn(<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>, onDown, 2, 3)}
    </div>
  )
}

function LensShiftPad({ onUp, onDown, onLeft, onRight }: {
  onUp: () => void; onDown: () => void; onLeft: () => void; onRight: () => void
}) {
  const btn = (label: React.ReactNode, handler: () => void, gCol?: number, gRow?: number) => (
    <button
      onClick={handler}
      className="flex items-center justify-center rounded transition-all"
      style={{ width: 40, height: 40, background: 'var(--secondary)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--secondary-foreground)', ...(gCol ? { gridColumn: gCol, gridRow: gRow } : {}) }}
    >
      {label}
    </button>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '40px 40px 40px', gridTemplateRows: '40px 40px 40px', gap: 3 }}>
      {btn(<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>, onUp, 2, 1)}
      {btn(<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>, onLeft, 1, 2)}
      <div className="flex items-center justify-center rounded" style={{ gridColumn: 2, gridRow: 2, width: 40, height: 40, background: '#08090C', border: '1px solid var(--border)' }}>
        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--border)' }} />
      </div>
      {btn(<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>, onRight, 3, 2)}
      {btn(<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>, onDown, 2, 3)}
    </div>
  )
}

/* ── Lens Preset Slot Card ── */

function PresetSlotCard({ slot, preset, isActive, onSave, onLoad, onUnload }: {
  slot: number
  preset: LensPreset | null
  isActive: boolean
  onSave: () => void
  onLoad: () => void
  onUnload: () => void
}) {
  return (
    <div
      className="rounded p-3 flex flex-col gap-2"
      style={{
        background: isActive ? 'rgba(245,158,11,0.07)' : 'var(--secondary)',
        border: `1px solid ${isActive ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
        boxShadow: isActive ? '0 0 0 1px rgba(245,158,11,0.1)' : 'none',
        minHeight: 110,
      }}
    >
      {/* Slot header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold" style={{ color: isActive ? 'var(--primary)' : 'var(--muted-foreground)', fontSize: 18, lineHeight: 1 }}>
            {slot}
          </span>
          {isActive && (
            <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--primary)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 9, letterSpacing: '0.08em' }}>
              ACTIVE
            </span>
          )}
        </div>
        {preset && (
          <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)', fontSize: 9 }}>
            {preset.savedAt.split(' ')[0]}
          </span>
        )}
      </div>

      {/* Preset info */}
      {preset ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{preset.name}</span>
          <div className="flex gap-2">
            <span className="font-mono" style={{ color: 'var(--muted-foreground)', fontSize: 9 }}>
              S {preset.shiftX >= 0 ? '+' : ''}{preset.shiftX},{preset.shiftY >= 0 ? '+' : ''}{preset.shiftY}
            </span>
            <span className="font-mono" style={{ color: 'var(--muted-foreground)', fontSize: 9 }}>Z:{preset.zoom}%</span>
            <span className="font-mono" style={{ color: 'var(--muted-foreground)', fontSize: 9 }}>F:{preset.focus}%</span>
          </div>
        </div>
      ) : (
        <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)', opacity: 0.4, letterSpacing: '0.08em' }}>— EMPTY —</span>
      )}

      {/* Action buttons */}
      <div className="flex gap-1 mt-auto">
        {!preset ? (
          <button onClick={onSave} className="flex-1 font-mono text-xs py-1 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--primary)', border: '1px solid rgba(245,158,11,0.2)', cursor: 'pointer' }}>
            SAVE
          </button>
        ) : isActive ? (
          <>
            <button onClick={onUnload} className="flex-1 font-mono text-xs py-1 rounded" style={{ background: 'var(--card)', color: 'var(--muted-foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              UNLOAD
            </button>
            <button onClick={onSave} className="font-mono text-xs px-2 py-1 rounded" style={{ background: 'var(--card)', color: 'var(--muted-foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              OVR
            </button>
          </>
        ) : (
          <>
            <button onClick={onLoad} className="flex-1 font-mono text-xs py-1 rounded" style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--accent)', border: '1px solid rgba(6,182,212,0.25)', cursor: 'pointer' }}>
              LOAD
            </button>
            <button onClick={onSave} className="font-mono text-xs px-2 py-1 rounded" style={{ background: 'var(--card)', color: 'var(--muted-foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              OVR
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Main export ── */

export default function DetailControl({ projector, project, booths, onBack, onUpdate }: {
  projector: Projector
  project: Project
  booths: Booth[]
  onBack: () => void
  onUpdate: (patch: Partial<Projector>) => void
}) {
  const [savePresetSlot, setSavePresetSlot] = useState<number | null>(null)
  const [presetNameInput, setPresetNameInput] = useState('')

  const booth = booths.find(b => b.id === projector.boothId)

  /* Lens helpers */
  function adjShiftX(d: number) { onUpdate({ lensShiftX: Math.max(-100, Math.min(100, projector.lensShiftX + d)) }) }
  function adjShiftY(d: number) { onUpdate({ lensShiftY: Math.max(-100, Math.min(100, projector.lensShiftY + d)) }) }
  function adjZoom(d: number) { onUpdate({ lensZoom: Math.max(0, Math.min(100, projector.lensZoom + d)) }) }
  function adjFocus(d: number) { onUpdate({ lensFocus: Math.max(0, Math.min(100, projector.lensFocus + d)) }) }

  function savePreset(slot: number) {
    if (!presetNameInput.trim()) return
    const now = new Date().toLocaleString('sv-SE').replace('T', ' ').slice(0, 16)
    const presets = [...projector.lensPresets] as (LensPreset | null)[]
    presets[slot - 1] = {
      slot, name: presetNameInput.trim(),
      shiftX: projector.lensShiftX, shiftY: projector.lensShiftY,
      zoom: projector.lensZoom, focus: projector.lensFocus,
      savedAt: now,
    }
    onUpdate({ lensPresets: presets })
    setSavePresetSlot(null)
    setPresetNameInput('')
  }

  function loadPreset(slot: number) {
    const p = projector.lensPresets[slot - 1]
    if (!p) return
    onUpdate({ lensShiftX: p.shiftX, lensShiftY: p.shiftY, lensZoom: p.zoom, lensFocus: p.focus, activeLensPreset: slot })
  }

  function unloadPreset() { onUpdate({ activeLensPreset: null }) }

  function initSave(slot: number) {
    const existing = projector.lensPresets[slot - 1]
    setPresetNameInput(existing?.name ?? `Preset ${slot}`)
    setSavePresetSlot(slot)
  }

  const tempColor = projector.temp > 70 ? '#EF4444' : projector.temp > 55 ? '#F59E0B' : '#22C55E'

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* ── TOP NAV ── */}
      <header className="flex items-center justify-between px-5 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(7,9,12,0.97)' }}>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--primary-foreground)" strokeWidth="2.5">
                <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--foreground)', letterSpacing: '-0.02em' }}>MikMaster</span>
          </div>
          <div className="w-px h-4" style={{ background: 'var(--border)' }} />
          {/* Breadcrumb */}
          <button onClick={onBack} className="font-mono text-xs flex items-center gap-1.5 transition-colors" style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            {project.name}
          </button>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>{booth?.name ?? projector.boothId}</span>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span className="font-mono text-xs font-medium" style={{ color: 'var(--foreground)' }}>{projector.name}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: projector.power === 'on' ? '#22C55E' : projector.power === 'standby' ? '#F59E0B' : '#374151' }} />
            <span className="font-mono text-xs" style={{ color: projector.power === 'on' ? '#22C55E' : 'var(--muted-foreground)', textTransform: 'uppercase' }}>{projector.power}</span>
          </div>
          <span className="font-mono text-xs" style={{ color: tempColor }}>{projector.temp}°C</span>
          <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{projector.ip}</span>
          {projector.errors.length > 0 && (
            <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: '#EF444415', color: '#EF4444', border: '1px solid #EF444430' }}>
              ⚠ {projector.errors[0]}
            </span>
          )}
        </div>
      </header>

      {/* ── 3-COLUMN BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL: Basic Controls ── */}
        <div className="flex flex-col h-full overflow-y-auto flex-shrink-0" style={{ width: 264, borderRight: '1px solid var(--border)', background: 'var(--card)', padding: '16px 16px' }}>

          {/* Power */}
          <SectionHeader label="POWER" />
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => onUpdate({ power: 'on', brightness: 85 })}
              className="flex-1 py-2.5 rounded font-mono text-xs font-medium flex items-center justify-center gap-1.5"
              style={{ background: projector.power === 'on' ? '#22C55E' : 'var(--secondary)', color: projector.power === 'on' ? '#001a00' : 'var(--secondary-foreground)', border: `1px solid ${projector.power === 'on' ? '#22C55E' : 'var(--border)'}`, cursor: 'pointer' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></svg>
              ON
            </button>
            <button
              onClick={() => onUpdate({ power: 'standby', brightness: 0 })}
              className="flex-1 py-2.5 rounded font-mono text-xs font-medium flex items-center justify-center gap-1.5"
              style={{ background: projector.power === 'standby' ? '#F59E0B' : 'var(--secondary)', color: projector.power === 'standby' ? '#1a0e00' : 'var(--secondary-foreground)', border: `1px solid ${projector.power === 'standby' ? '#F59E0B' : 'var(--border)'}`, cursor: 'pointer' }}
            >
              STBY
            </button>
            <button
              onClick={() => onUpdate({ power: 'off', brightness: 0 })}
              className="flex-1 py-2.5 rounded font-mono text-xs font-medium"
              style={{ background: projector.power === 'off' ? '#374151' : 'var(--secondary)', color: 'var(--secondary-foreground)', border: `1px solid ${projector.power === 'off' ? '#374151' : 'var(--border)'}`, cursor: 'pointer' }}
            >
              OFF
            </button>
          </div>

          {/* Shutter */}
          <SectionHeader label="SHUTTER / BLANK" />
          <button
            onClick={() => onUpdate({ shutter: !projector.shutter })}
            className="w-full py-2.5 rounded font-mono text-xs font-semibold flex items-center justify-center gap-2 mb-5"
            style={{
              background: projector.shutter ? 'rgba(245,158,11,0.15)' : 'var(--secondary)',
              color: projector.shutter ? '#F59E0B' : 'var(--secondary-foreground)',
              border: `1px solid ${projector.shutter ? 'rgba(245,158,11,0.5)' : 'var(--border)'}`,
              cursor: 'pointer', letterSpacing: '0.06em',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            {projector.shutter ? 'SHUTTER CLOSED' : 'SHUTTER OPEN'}
          </button>

          {/* Input selector */}
          <SectionHeader label="INPUT SOURCE" />
          <div className="flex flex-wrap gap-1.5 mb-5">
            {INPUTS.map(inp => (
              <button
                key={inp}
                onClick={() => onUpdate({ input: inp })}
                className="font-mono text-xs px-2.5 py-1.5 rounded transition-all"
                style={{
                  background: projector.input === inp ? 'var(--accent)' : 'var(--secondary)',
                  color: projector.input === inp ? 'var(--accent-foreground)' : 'var(--secondary-foreground)',
                  border: `1px solid ${projector.input === inp ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}
              >
                {inp}
              </button>
            ))}
          </div>

          {/* Status info */}
          <SectionHeader label="STATUS" />
          <div className="flex flex-col gap-2">
            {[
              ['MODEL', projector.model ?? 'Unknown'],
              ['IP ADDRESS', projector.ip],
              ['LAMP HOURS', `${projector.lampHours.toLocaleString()}h`],
              ['BRIGHTNESS', `${projector.brightness}%`],
              ['TEMPERATURE', projector.temp > 0 ? `${projector.temp}°C` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between">
                <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)', fontSize: 10, letterSpacing: '0.08em' }}>{k}</span>
                <span className="font-mono text-xs" style={{ color: k === 'TEMPERATURE' ? tempColor : 'var(--foreground)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── CENTER: Preview + OSD ── */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--background)' }}>
          {/* Projection preview */}
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full" style={{ maxWidth: 640 }}>
              {/* Screen frame */}
              <div className="relative rounded overflow-hidden scanlines" style={{ aspectRatio: '16/9', background: projector.power === 'on' && !projector.shutter ? '#05090F' : '#070809', border: '1px solid var(--border)', boxShadow: projector.power === 'on' && !projector.shutter ? '0 0 40px rgba(6,182,212,0.08), inset 0 0 80px rgba(6,182,212,0.03)' : 'none' }}>
                {projector.power === 'on' && !projector.shutter ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    {/* Center beam */}
                    <div className="w-32 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', opacity: 0.4 }} />
                    <div className="font-mono text-2xl font-medium" style={{ color: 'var(--accent)', opacity: 0.25, letterSpacing: '0.3em' }}>
                      {projector.input}
                    </div>
                    <div className="flex gap-6">
                      <span className="font-mono text-xs" style={{ color: '#22C55E', opacity: 0.5 }}>{projector.brightness}% BRT</span>
                      <span className="font-mono text-xs" style={{ color: 'var(--accent)', opacity: 0.4 }}>Z:{projector.lensZoom}% F:{projector.lensFocus}%</span>
                    </div>
                    {projector.activeLensPreset && (
                      <div className="font-mono text-xs px-3 py-1 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--primary)', border: '1px solid rgba(245,158,11,0.2)', opacity: 0.7 }}>
                        PRESET {projector.activeLensPreset} ACTIVE
                      </div>
                    )}
                    {/* Corner guides */}
                    {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
                      <div key={i} className={`absolute ${pos} w-4 h-4`} style={{ borderColor: 'rgba(6,182,212,0.2)', borderStyle: 'solid', borderWidth: i < 2 ? '1px 0 0 1px' : '0 1px 1px 0' }} />
                    ))}
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)' }} />
                  </div>
                ) : projector.power === 'standby' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: '#F59E0B', opacity: 0.6 }} />
                    <span className="font-mono text-sm" style={{ color: '#F59E0B', opacity: 0.5, letterSpacing: '0.2em' }}>STANDBY</span>
                  </div>
                ) : projector.shutter && projector.power === 'on' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" opacity="0.4">
                      <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                    <span className="font-mono text-sm" style={{ color: '#F59E0B', opacity: 0.5, letterSpacing: '0.2em' }}>SHUTTER CLOSED</span>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-mono text-sm" style={{ color: 'var(--muted-foreground)', opacity: 0.3, letterSpacing: '0.2em' }}>NO OUTPUT</span>
                  </div>
                )}
              </div>

              {/* Screen label strip */}
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>{projector.name} · {projector.location}</span>
                <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)' }}>{projector.id}</span>
              </div>
            </div>
          </div>

          {/* OSD Controls */}
          <div className="flex-shrink-0 px-6 pb-6" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="pt-4">
              <SectionHeader label="OSD NAVIGATION" />
              <div className="flex items-start gap-8 justify-center">
                {/* Menu button */}
                <div className="flex flex-col gap-2">
                  <button
                    className="font-mono text-xs py-2 rounded font-medium"
                    style={{ width: 80, background: 'var(--secondary)', color: 'var(--secondary-foreground)', border: '1px solid var(--border)', cursor: 'pointer', letterSpacing: '0.06em' }}
                  >
                    MENU
                  </button>
                  <div className="flex flex-col gap-1.5">
                    <button className="font-mono text-xs py-1.5 rounded" style={{ width: 80, background: 'var(--secondary)', color: 'var(--muted-foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}>BACK</button>
                    <button className="font-mono text-xs py-1.5 rounded" style={{ width: 80, background: 'var(--secondary)', color: 'var(--muted-foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}>EXIT</button>
                  </div>
                </div>

                {/* D-pad */}
                <DPad
                  onUp={() => {}}
                  onDown={() => {}}
                  onLeft={() => {}}
                  onRight={() => {}}
                  onCenter={() => {}}
                  centerLabel="ENT"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Lens Control + Presets ── */}
        <div className="flex flex-col h-full overflow-y-auto flex-shrink-0" style={{ width: 292, borderLeft: '1px solid var(--border)', background: 'var(--card)', padding: '16px 16px' }}>

          {/* Lens Shift */}
          <SectionHeader label="LENS SHIFT" />
          <div className="flex items-center justify-between mb-4">
            <LensShiftPad
              onUp={() => adjShiftY(5)}
              onDown={() => adjShiftY(-5)}
              onLeft={() => adjShiftX(-5)}
              onRight={() => adjShiftX(5)}
            />
            <div className="flex flex-col gap-1.5 ml-3">
              <div className="flex justify-between">
                <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)', fontSize: 10 }}>H</span>
                <span className="font-mono text-xs" style={{ color: 'var(--foreground)' }}>{projector.lensShiftX >= 0 ? '+' : ''}{projector.lensShiftX}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)', fontSize: 10 }}>V</span>
                <span className="font-mono text-xs" style={{ color: 'var(--foreground)' }}>{projector.lensShiftY >= 0 ? '+' : ''}{projector.lensShiftY}</span>
              </div>
              <button onClick={() => { onUpdate({ lensShiftX: 0, lensShiftY: 0 }) }} className="font-mono px-2 py-1 rounded" style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 9 }}>
                RESET
              </button>
            </div>
          </div>

          {/* Zoom + Focus row */}
          <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {/* Zoom */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.08em', fontSize: 10 }}>ZOOM</span>
                <span className="font-mono text-xs" style={{ color: 'var(--foreground)' }}>{projector.lensZoom}%</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => adjZoom(-5)} className="flex-1 py-2.5 rounded font-mono text-sm font-bold" style={{ background: 'var(--secondary)', color: 'var(--secondary-foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}>−</button>
                <button onClick={() => adjZoom(5)} className="flex-1 py-2.5 rounded font-mono text-sm font-bold" style={{ background: 'var(--secondary)', color: 'var(--secondary-foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}>+</button>
              </div>
              <div className="h-0.5 rounded-full mt-2" style={{ background: 'var(--border)' }}>
                <div className="h-0.5 rounded-full" style={{ width: `${projector.lensZoom}%`, background: 'var(--accent)' }} />
              </div>
            </div>

            {/* Focus */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs" style={{ color: 'var(--muted-foreground)', letterSpacing: '0.08em', fontSize: 10 }}>FOCUS</span>
                <span className="font-mono text-xs" style={{ color: 'var(--foreground)' }}>{projector.lensFocus}%</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => adjFocus(-5)} className="flex-1 py-2.5 rounded font-mono text-xs font-bold" style={{ background: 'var(--secondary)', color: 'var(--secondary-foreground)', border: '1px solid var(--border)', cursor: 'pointer', letterSpacing: 0 }}>NEAR</button>
                <button onClick={() => adjFocus(5)} className="flex-1 py-2.5 rounded font-mono text-xs font-bold" style={{ background: 'var(--secondary)', color: 'var(--secondary-foreground)', border: '1px solid var(--border)', cursor: 'pointer', letterSpacing: 0 }}>FAR</button>
              </div>
              <div className="h-0.5 rounded-full mt-2" style={{ background: 'var(--border)' }}>
                <div className="h-0.5 rounded-full" style={{ width: `${projector.lensFocus}%`, background: 'var(--primary)' }} />
              </div>
            </div>
          </div>

          {/* Preset slots */}
          <SectionHeader label="LENS PRESETS" />

          {/* Save modal inline */}
          {savePresetSlot !== null && (
            <div className="mb-3 p-3 rounded" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <p className="font-mono text-xs mb-2" style={{ color: 'var(--primary)' }}>SAVE TO SLOT {savePresetSlot}</p>
              <input
                autoFocus
                type="text"
                value={presetNameInput}
                onChange={e => setPresetNameInput(e.target.value)}
                placeholder="Preset name…"
                onKeyDown={e => { if (e.key === 'Enter') savePreset(savePresetSlot); if (e.key === 'Escape') setSavePresetSlot(null) }}
                className="font-mono text-xs px-2 py-1.5 rounded w-full outline-none mb-2"
                style={{ background: 'var(--muted)', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--foreground)' }}
              />
              <div className="flex gap-1">
                <button onClick={() => savePreset(savePresetSlot)} className="flex-1 font-mono text-xs py-1 rounded" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none', cursor: 'pointer' }}>SAVE</button>
                <button onClick={() => setSavePresetSlot(null)} className="font-mono text-xs px-3 py-1 rounded" style={{ background: 'var(--secondary)', color: 'var(--secondary-foreground)', border: '1px solid var(--border)', cursor: 'pointer' }}>CANCEL</button>
              </div>
            </div>
          )}

          <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {[1, 2, 3, 4].map(slot => (
              <PresetSlotCard
                key={slot}
                slot={slot}
                preset={projector.lensPresets[slot - 1] ?? null}
                isActive={projector.activeLensPreset === slot}
                onSave={() => initSave(slot)}
                onLoad={() => loadPreset(slot)}
                onUnload={unloadPreset}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

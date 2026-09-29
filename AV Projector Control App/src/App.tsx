import { useState } from 'react'
import StartScreen from './components/StartScreen'
import Dashboard from './components/Dashboard'
import DetailControl from './components/DetailControl'
import type { Projector, Booth, Project } from './types'

export default function App() {
  const [screen, setScreen] = useState<'start' | 'dashboard' | 'detail'>('start')
  const [project, setProject] = useState<Project | null>(null)
  const [booths, setBooths] = useState<Booth[]>([])
  const [projectors, setProjectors] = useState<Projector[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function handleLaunch(p: Project, b: Booth[], pjs: Projector[]) {
    setProject(p)
    setBooths(b)
    setProjectors(pjs)
    setScreen('dashboard')
  }

  function updateProjector(id: string, patch: Partial<Projector>) {
    setProjectors(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
  }

  const selected = projectors.find(p => p.id === selectedId) ?? null

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {screen === 'start' && (
        <StartScreen onLaunch={handleLaunch} />
      )}
      {screen === 'dashboard' && project && (
        <Dashboard
          project={project}
          booths={booths}
          projectors={projectors}
          onSelect={id => { setSelectedId(id); setScreen('detail') }}
          onUpdate={updateProjector}
        />
      )}
      {screen === 'detail' && selected && project && (
        <DetailControl
          projector={selected}
          project={project}
          booths={booths}
          onBack={() => { setScreen('dashboard'); setSelectedId(null) }}
          onUpdate={patch => updateProjector(selected.id, patch)}
        />
      )}
    </div>
  )
}

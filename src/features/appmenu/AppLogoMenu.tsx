import { Check, FileDown, FolderOpen, History, Loader2, Plus, Power, Save } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppLogo } from '@/components/layout/AppLogo'
import { MenuHeading, MenuItem, MenuSeparator, PopupMenu, type MenuPoint } from '@/components/ui/PopupMenu'
import { ProjectFileError } from '@/services/projectFile'
import { formatShortDate } from '@/utils/format'
import type { SavedProjectSummary } from '@/types'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'
import { useProjectCommands } from './useProjectCommands'
import { useGateway } from '@/store/useGateway'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const MOD = IS_MAC ? '⌘' : 'Ctrl+'
const RECENT_LIMIT = 6

type Busy = null | 'open' | 'save' | 'export' | 'recent'

/**
 * Logo có menu File (bấm hoặc chuột phải): New, Open…, Open Recent, Save, Export…
 * Phím tắt khi đang mở project: ⌘S lưu, ⇧⌘S xuất file, ⌘O mở file.
 */
export function AppLogoMenu({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const cmd = useProjectCommands()
  const { mode: gatewayMode, quit } = useGateway()
  const [at, setAt] = useState<MenuPoint | null>(null)
  const [recent, setRecent] = useState<SavedProjectSummary[] | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const close = useCallback(() => { setAt(null); setMessage(null) }, [])
  const lastAt = useRef<MenuPoint>({ x: 16, y: 48 })
  // Việc đang chờ người dùng trả lời "lưu thay đổi không?".
  const [pending, setPending] = useState<{ label: string; go: () => void } | null>(null)

  /** Rời project đang mở: nếu còn thay đổi chưa lưu thì hỏi trước. */
  function guard(label: string, go: () => void) {
    if (!cmd.dirty) return go()
    setAt(null)
    setPending({ label, go })
  }

  /** Chạy lại trong menu (mở lại tại chỗ cũ) để hiện tiến trình / lỗi sau khi hỏi lưu. */
  function inMenu(kind: Exclude<Busy, null>, action: () => Promise<boolean>) {
    return () => {
      setAt(lastAt.current)
      void run(kind, action)
    }
  }

  function openMenu(e: React.MouseEvent) {
    e.preventDefault()
    const r = e.currentTarget.getBoundingClientRect()
    // Chuột phải: mở tại con trỏ. Bấm trái / bàn phím: mở ngay dưới logo.
    const point = e.type === 'contextmenu' ? { x: e.clientX, y: e.clientY } : { x: r.left, y: r.bottom + 4 }
    lastAt.current = point
    setAt(point)
    setMessage(null)
    setRecent(null)
    void cmd.listRecent().then(list => setRecent(list.slice(0, RECENT_LIMIT)))
  }

  async function run(kind: Exclude<Busy, null>, action: () => Promise<boolean>, done?: string) {
    setBusy(kind)
    setMessage(null)
    try {
      const ok = await action()
      if (ok && done) {
        setMessage({ tone: 'ok', text: done })
        setTimeout(close, 700)
      } else if (ok) {
        close()
      } else if (kind === 'save') {
        setMessage({ tone: 'error', text: 'Could not save' })
      }
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof ProjectFileError ? e.message : 'Something went wrong' })
    } finally {
      setBusy(null)
    }
  }

  // Phím tắt dùng chung các lệnh của menu.
  const { hasProject, save, exportFile, openFile } = cmd
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 's' && hasProject) {
        e.preventDefault()
        void (e.shiftKey ? exportFile() : save())
      } else if (key === 'o' && !e.shiftKey) {
        e.preventDefault()
        guardRef.current('opening another project', () => { void openFile().catch(() => undefined) })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hasProject, save, exportFile, openFile])
  const guardRef = useRef(guard)
  guardRef.current = guard

  const spin = (kind: Busy, icon: React.ReactNode) => (busy === kind ? <Loader2 size={11} className="animate-spin" /> : icon)

  return (
    <>
      <button type="button" aria-label="File menu" aria-haspopup="menu" aria-expanded={at !== null} title="File menu (click or right-click)"
        onClick={openMenu} onContextMenu={openMenu} className="-m-1 rounded-sm p-1 transition-colors hover:bg-muted">
        <AppLogo size={size} />
      </button>

      {at && (
        <PopupMenu at={at} label="File" onClose={close} className="w-64">
          <MenuItem icon={<Plus size={11} />} label="New project" onSelect={() => { close(); guard('starting a new project', cmd.newProject) }} />
          <MenuItem icon={spin('open', <FolderOpen size={11} />)} label="Open file…" hint={`${MOD}O`} disabled={busy !== null}
            onSelect={() => guard('opening another project', inMenu('open', cmd.openFile))} />

          <MenuSeparator />
          <MenuHeading><History size={10} />OPEN RECENT</MenuHeading>
          {recent === null && <p className="px-3 py-1 font-mono text-[10px] text-muted-foreground">Loading…</p>}
          {recent?.length === 0 && <p className="px-3 py-1 font-mono text-[10px] text-muted-foreground">No saved projects</p>}
          {recent?.map(r => {
            const current = r.id === cmd.currentId
            return (
              <MenuItem key={r.id} disabled={current || busy !== null} icon={current && <Check size={11} className="text-primary" />}
                label={<>{r.name} <span className="font-mono text-[10px] text-muted-foreground">· {r.deviceCount} dev</span></>}
                hint={formatShortDate(r.savedAt)} onSelect={() => guard(`opening “${r.name}”`, inMenu('recent', () => cmd.openRecent(r.id)))} />
            )
          })}

          <MenuSeparator />
          <MenuItem icon={spin('save', <Save size={11} />)} label="Save" hint={`${MOD}S`} disabled={!cmd.hasProject || busy !== null}
            onSelect={() => void run('save', cmd.save, 'Saved')} />
          <MenuItem icon={spin('export', <FileDown size={11} />)} label="Export to file…" hint={IS_MAC ? '⇧⌘S' : 'Ctrl+Shift+S'} disabled={!cmd.hasProject || busy !== null}
            onSelect={() => void run('export', cmd.exportFile, 'File saved')} />

          {gatewayMode === 'live' && (
            <>
              <MenuSeparator />
              <MenuItem icon={<Power size={11} />} label="Quit MikMaster" disabled={busy !== null}
                onSelect={() => { close(); guard('quitting MikMaster', () => { void quit() }) }} />
            </>
          )}

          {message && (
            <p role="status" className={message.tone === 'ok' ? 'flex items-center gap-1.5 px-3 pt-1.5 pb-1 font-mono text-[10px] text-ok' : 'px-3 pt-1.5 pb-1 font-mono text-[10px] text-danger'}>
              {message.tone === 'ok' && <Check size={10} strokeWidth={3} />}{message.text}
            </p>
          )}
        </PopupMenu>
      )}

      {pending && (
        <UnsavedChangesDialog projectName={cmd.projectName} actionLabel={pending.label} onSave={cmd.save}
          onDiscard={() => { const { go } = pending; setPending(null); go() }}
          onCancel={() => setPending(null)} />
      )}
    </>
  )
}

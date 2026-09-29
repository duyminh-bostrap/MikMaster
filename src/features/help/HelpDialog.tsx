import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useT } from '@/i18n'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const MOD = IS_MAC ? '⌘' : 'Ctrl+'

/** Hướng dẫn nhanh các thao tác chính. */
export function HelpDialog({ onClose }: { onClose: () => void }) {
  const t = useT()
  const sections: Array<[string, string[]]> = [
    [t('Start'), [
      t('New project: enter a name and booths (optional), then scan an IP range.'),
      t('LOGIN & LAUNCH uses one login (default admin/admin) for every projector that needs it.'),
      t('Open a saved project from the Start screen, or a .mikmaster.json file.'),
    ]],
    [t('Dashboard'), [
      t('Open a booth (sidebar or tabs) to switch all its projectors on or off. ALL ON starts them one by one (Settings → delay).'),
      t('Turning projectors off and closing shutters in bulk asks for confirmation.'),
      t('Search with / and filter by status; ADD PROJECTOR adds one by IP.'),
      t('Drag a projector card onto a booth, or right-click it, to move it. Hover a card to edit or remove it.'),
      t('Double-click a project or booth name to rename it.'),
    ]],
    [t('Projector page'), [
      t('Power, shutter, input and the status of one projector. PING checks the network and the control port.'),
      t('If the projector has a password, sign in first; the controls appear once the login is accepted.'),
      t('RAW COMMAND sends a command exactly as typed — useful to check commands against the real projector.'),
    ]],
    [t('Saving'), [
      t('Save: {mod}S. Export to a file: Shift+{mod}S. Open a file: {mod}O.', { mod: MOD }),
      t('Project files never contain projector passwords.'),
      t('Quit MikMaster from the logo menu when you are done.'),
    ]],
  ]
  return (
    <Modal title={t('HELP')} onClose={onClose} onSubmit={onClose}
      footer={<Button type="submit" variant="primary" className="ml-auto px-6">{t('CLOSE')}</Button>}>
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
        {sections.map(([title, items]) => (
          <section key={title}>
            <h3 className="mb-1.5 font-mono text-xs tracking-[0.08em] text-accent">{title.toUpperCase()}</h3>
            <ul className="flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed text-foreground marker:text-muted-foreground">
              {items.map(i => <li key={i}>{i}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  )
}

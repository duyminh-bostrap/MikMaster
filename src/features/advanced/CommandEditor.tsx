import { RotateCcw, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { TEMPLATE_KEYS, type CommandBrand, type CommandTemplates } from '../../../shared/api.ts'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Field'
import { DEFAULT_COMMANDS } from '@/constants/commandCatalog'
import { useT } from '@/i18n'
import { setCommandOverrides, useCommandOverrides } from '@/services/commandOverrides'
import { useGateway } from '@/store/useGateway'

type Key = keyof CommandTemplates

const LABEL: Record<Key, string> = {
  powerOn: 'POWER ON', powerOff: 'POWER OFF', shutterClose: 'SHUTTER CLOSE', shutterOpen: 'SHUTTER OPEN',
  testPatternOn: 'TEST PATTERN ON', testPatternOff: 'TEST PATTERN OFF',
  temperatureQuery: 'TEMPERATURE QUERY', temperatureRegex: 'TEMPERATURE PATTERN',
  lampHoursQuery: 'LAMP HOURS QUERY', lampHoursRegex: 'LAMP HOURS PATTERN',
}

const GROUPS: { title: string; keys: Key[] }[] = [
  { title: 'Power', keys: ['powerOn', 'powerOff'] },
  { title: 'Shutter', keys: ['shutterClose', 'shutterOpen'] },
  { title: 'Test pattern', keys: ['testPatternOn', 'testPatternOff'] },
  { title: 'Readings', keys: ['temperatureQuery', 'temperatureRegex', 'lampHoursQuery', 'lampHoursRegex'] },
]

/**
 * Sửa lệnh dùng chung cho mọi máy cùng hãng. Lệnh nhập ở đây được gateway gửi nguyên văn thay cho lệnh có sẵn của driver
 * (ô trống = giữ lệnh có sẵn, hiện mờ làm gợi ý). Lệnh riêng khai báo ở từng máy (mục Nâng cao trang máy) vẫn được ưu tiên.
 */
export function CommandEditor({ brand }: { brand: CommandBrand }) {
  const t = useT()
  const { gateway } = useGateway()
  const saved = useCommandOverrides(gateway)[brand] ?? {}
  const [draft, setDraft] = useState<CommandTemplates>(saved)
  // Lệnh đã lưu tải về sau khi trang mở (hoặc đổi từ nơi khác) → cập nhật ô nhập.
  const savedKey = JSON.stringify(saved)
  useEffect(() => { setDraft(JSON.parse(savedKey) as CommandTemplates) }, [savedKey])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const defaults = DEFAULT_COMMANDS[brand]

  const dirty = TEMPLATE_KEYS.some(k => (draft[k] ?? '') !== (saved[k] ?? ''))
  const customCount = TEMPLATE_KEYS.filter(k => saved[k]).length
  const incomplete = (a: Key, b: Key) => !!draft[a]?.trim() !== !!draft[b]?.trim()

  async function persist(next: CommandTemplates) {
    if (!gateway) return
    setBusy(true)
    setMessage(null)
    const cleaned: CommandTemplates = {}
    for (const k of TEMPLATE_KEYS) if (next[k]?.trim()) cleaned[k] = next[k]
    const all = { ...(await gateway.getCommandOverrides().then(r => (r.ok ? r.value : {}))), [brand]: cleaned }
    if (Object.keys(cleaned).length === 0) delete all[brand]
    const r = await gateway.saveCommandOverrides(all)
    setBusy(false)
    if (r.ok) { setCommandOverrides(r.value); setDraft(r.value[brand] ?? {}); setMessage({ tone: 'ok', text: t('Saved') }) }
    else setMessage({ tone: 'error', text: r.message })
  }

  return (
    <section aria-label={t('Custom commands')} className="rounded-sm border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-xs tracking-[0.15em] text-muted-foreground">{t('CUSTOM COMMANDS')}{customCount > 0 && <span className="ml-2 text-accent">{t('{n} command(s) set', { n: customCount })}</span>}</h2>
        <div className="flex items-center gap-2">
          {message && <span role="status" className={message.tone === 'ok' ? 'font-mono text-[10px] text-ok' : 'font-mono text-[10px] text-danger'}>{message.text}</span>}
          <Button size="xs" disabled={!gateway || busy || (customCount === 0 && !dirty)} onClick={() => void persist({})}><RotateCcw size={10} />{t('RESET TO DEFAULT')}</Button>
          <Button size="xs" variant="primary" disabled={!gateway || busy || !dirty} onClick={() => void persist(draft)}><Save size={10} />{t('SAVE')}</Button>
        </div>
      </div>

      {!gateway ? (
        <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">{t('Commands are stored by the gateway — available when MikMaster is connected to it.')}</p>
      ) : (
        <>
          <p className="mb-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
            {t('A command typed here is sent exactly as written to every {brand} projector, instead of the built-in one. Leave a box empty to keep the built-in command (shown faintly). A command set on a single projector wins over this one.', { brand })}
          </p>
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            {GROUPS.map(g => (
              <fieldset key={g.title} className="flex flex-col gap-2">
                <legend className="mb-1 font-mono text-[10px] tracking-[0.15em] text-primary/80">{t(g.title).toUpperCase()}</legend>
                {g.keys.map(k => (
                  <Field key={k} label={t(LABEL[k])}>
                    {id => <TextInput id={id} value={draft[k] ?? ''} autoComplete="off" spellCheck={false} className="px-2 py-1.5 text-xs"
                      placeholder={defaults[k] ?? (k.endsWith('Regex') ? t('optional, e.g. TMP:(\\d+)') : t('from the projector manual'))}
                      onChange={e => { setDraft({ ...draft, [k]: e.target.value }); setMessage(null) }} />}
                  </Field>
                ))}
              </fieldset>
            ))}
          </div>
          {(incomplete('testPatternOn', 'testPatternOff')) && (
            <p className="mt-3 font-mono text-[10px] text-warn">{t('Fill both commands of a pair (ON and OFF, CLOSE and OPEN) to enable that button.')}</p>
          )}
        </>
      )}
    </section>
  )
}

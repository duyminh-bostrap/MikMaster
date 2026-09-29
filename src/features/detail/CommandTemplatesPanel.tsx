import { useState } from 'react'
import { TEMPLATE_PROTOCOLS, isDriverProtocol, type CommandTemplates } from '../../../shared/api.ts'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Field'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { useProjectActions } from '@/store/hooks'
import { appendLog } from '@/utils/projector'
import type { Projector } from '@/types'
import { t } from '@/i18n'

type Key = keyof CommandTemplates

const LABEL: Record<Key, string> = {
  powerOn: 'POWER ON', powerOff: 'POWER OFF', shutterClose: 'SHUTTER CLOSE', shutterOpen: 'SHUTTER OPEN',
  testPatternOn: 'TEST PATTERN ON', testPatternOff: 'TEST PATTERN OFF',
  temperatureQuery: 'TEMPERATURE QUERY', temperatureRegex: 'TEMPERATURE PATTERN',
  lampHoursQuery: 'LAMP HOURS QUERY', lampHoursRegex: 'LAMP HOURS PATTERN',
}

const EXAMPLE: Record<string, Partial<CommandTemplates>> = {
  'generic-tcp': { powerOn: 'PWR ON\\r', powerOff: 'PWR OFF\\r' },
  'generic-udp': { powerOn: 'PWR ON\\r', powerOff: 'PWR OFF\\r' },
  'art-net': { powerOn: '0 1=255', powerOff: '0 1=0' },
  'http-api': { powerOn: 'POST /api/power {"on":true}', powerOff: 'POST /api/power {"on":false}' },
}

const SYNTAX: Record<string, string> = {
  'generic-tcp': 'Text sent as-is; use \\r \\n \\xHH for control characters.',
  'generic-udp': 'One datagram; use \\r \\n \\xHH for control characters.',
  'art-net': '[universe] channel=value … e.g. "0 1=255 5-8=128".',
  'http-api': '"GET /path" or "POST /path body" (login from the Account section).',
}

/**
 * Lệnh người dùng tự khai báo, gửi qua đường RAW COMMAND của giao thức:
 *   - Giao thức chung (TCP/UDP/Art-Net/HTTP): Power, Shutter, Test Pattern.
 *   - Giao thức của hãng: chỉ Test Pattern (chưa có lệnh test pattern đã xác minh của hãng).
 * Cặp nào để trống thì nút tương ứng chỉ đổi trạng thái trong app.
 */
export function CommandTemplatesPanel({ projector: p }: { projector: Projector }) {
  const { updateProjector } = useProjectActions()
  const type = p.network.protocol.type
  const saved = p.network.protocol.commands ?? {}
  const [draft, setDraft] = useState<CommandTemplates>(saved)
  const generic = TEMPLATE_PROTOCOLS.includes(type)
  if (!generic && !isDriverProtocol(type)) return null

  const keys: Key[] = generic
    ? ['powerOn', 'powerOff', 'shutterClose', 'shutterOpen', 'testPatternOn', 'testPatternOff']
    : ['testPatternOn', 'testPatternOff']
  // Số liệu thật chỉ đọc được khi có driver theo dõi trạng thái (không áp dụng cho giao thức chung).
  const readings: Key[] = generic ? [] : ['temperatureQuery', 'temperatureRegex', 'lampHoursQuery', 'lampHoursRegex']
  const dirty = [...keys, ...readings].some(k => (draft[k] ?? '') !== (saved[k] ?? ''))
  const incomplete = (a: Key, b: Key) => keys.includes(a) && !!draft[a]?.trim() !== !!draft[b]?.trim()

  function save() {
    const commands: CommandTemplates = {}
    for (const k of Object.keys(LABEL) as Key[]) if (draft[k]?.trim()) commands[k] = draft[k]
    updateProjector(p.id, {
      network: { ...p.network, protocol: { ...p.network.protocol, commands } },
      log: appendLog(p, 'info', `Command templates saved (${Object.keys(commands).length} set)`),
    })
  }

  return (
    <>
      <SectionHeader label={t('COMMANDS')} />
      <div className="mb-5 flex flex-col gap-2.5">
        <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
          {generic
            ? <>{t('This protocol has no standard commands. Power and Shutter buttons send what you enter here.')} {t(SYNTAX[type] ?? '')}</>
            : t('Test pattern commands are not standardised: copy them from the projector manual and try them in RAW COMMAND first. They are sent exactly as typed.')}
        </p>
        {keys.map(k => (
          <Field key={k} label={t(LABEL[k])}>
            {id => <TextInput id={id} value={draft[k] ?? ''} placeholder={EXAMPLE[type]?.[k] ?? t('from the projector manual')} autoComplete="off" spellCheck={false}
              onChange={e => setDraft({ ...draft, [k]: e.target.value })} className="px-2 py-1.5 text-xs" />}
          </Field>
        ))}
        {(incomplete('powerOn', 'powerOff') || incomplete('shutterClose', 'shutterOpen') || incomplete('testPatternOn', 'testPatternOff')) && (
          <p className="font-mono text-[10px] text-warn">{t('Fill both commands of a pair (ON and OFF, CLOSE and OPEN) to enable that button.')}</p>
        )}
        {readings.length > 0 && (
          <>
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
              {t('Readings: enter the query command from the manual and, if needed, a pattern whose first group captures the number (e.g. TMP:(\\d+)). Empty pattern = last number in the reply. Checked every few seconds.')}
            </p>
            {readings.map(k => (
              <Field key={k} label={t(LABEL[k])}>
                {id => <TextInput id={id} value={draft[k] ?? ''} autoComplete="off" spellCheck={false}
                  placeholder={k.endsWith('Regex') ? t('optional, e.g. TMP:(\\d+)') : t('from the projector manual')}
                  onChange={e => setDraft({ ...draft, [k]: e.target.value })} className="px-2 py-1.5 text-xs" />}
              </Field>
            ))}
          </>
        )}
        <Button variant="primary" disabled={!dirty} onClick={save}>{t('SAVE COMMANDS')}</Button>
      </div>
    </>
  )
}

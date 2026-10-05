import { ArrowLeft, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { COMMAND_BRANDS, type CommandBrand } from '../../shared/api.ts'
import { AppFooter } from '@/components/layout/AppFooter'
import { GatewayBadge } from '@/components/layout/GatewayBadge'
import { LicenseBadge } from '@/components/layout/LicenseBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { AppLogoMenu } from '@/features/appmenu/AppLogoMenu'
import { CommandEditor } from '@/features/advanced/CommandEditor'
import { COMMAND_CATALOG, type CommandStatus } from '@/constants/commandCatalog'
import { useT } from '@/i18n'
import { useSettings } from '@/services/settings'
import { cn } from '@/utils/cn'

const BRAND_LABEL: Record<CommandBrand, string> = { pjlink: 'PJLink', panasonic: 'Panasonic NTCONTROL', christie: 'Christie', barco: 'Barco Pulse' }

const STATUS: Record<CommandStatus, { label: string; tone: 'ok' | 'warn' | 'off' }> = {
  device: { label: 'CHECKED ON A PROJECTOR', tone: 'ok' },
  doc: { label: 'FROM MANUAL', tone: 'warn' },
  unverified: { label: 'UNVERIFIED', tone: 'off' },
}

/**
 * Trang Nâng cao (menu logo): tài liệu các lệnh điều khiển theo hãng — có nguồn và mức độ đã kiểm — và nơi sửa lệnh
 * dùng chung cho mọi máy cùng hãng. Không cần mở project.
 */
export default function AdvancedPage() {
  const t = useT()
  const navigate = useNavigate()
  const lang = useSettings().language
  const [brand, setBrand] = useState<CommandBrand>('christie')
  const [query, setQuery] = useState('')
  const [only, setOnly] = useState<'all' | 'read' | 'write'>('all')

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return COMMAND_CATALOG.filter(e => e.group === brand)
      .filter(e => only === 'all' || (only === 'write') === e.set)
      .filter(e => !needle || [e.cmd, e.en, e.vi, e.note?.en, e.note?.vi, e.source].some(x => x?.toLowerCase().includes(needle)))
  }, [brand, query, only])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-background px-6 py-3">
        <div className="flex items-center gap-3">
          <AppLogoMenu size="lg" />
          <Badge>v{__APP_VERSION__}</Badge>
        </div>
        <Button size="sm" onClick={() => navigate(-1)}><ArrowLeft size={12} />{t('BACK')}</Button>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
        <div>
          <h1 className="font-mono text-sm tracking-[0.2em] text-primary">{t('ADVANCED')}</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{t('Command reference by brand, and commands you can change for every projector of that brand.')}</p>
        </div>

        <div role="tablist" aria-label={t('Brand')} className="flex flex-wrap gap-1.5">
          {COMMAND_BRANDS.map(b => (
            <Button key={b} role="tab" aria-selected={brand === b} variant="accent" selected={brand === b} onClick={() => setBrand(b)}>{BRAND_LABEL[b]}</Button>
          ))}
        </div>

        <CommandEditor key={brand} brand={brand} />

        <section aria-label={t('Command reference')}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-mono text-xs tracking-[0.15em] text-muted-foreground">{t('COMMAND REFERENCE')} · {BRAND_LABEL[brand]}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={12} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
                <TextInput aria-label={t('Search commands')} placeholder={t('Search commands')} value={query} onChange={e => setQuery(e.target.value)} className="w-56 py-1.5 pl-7 text-xs" />
              </div>
              {(['all', 'read', 'write'] as const).map(k => (
                <Button key={k} size="xs" variant="accent" selected={only === k} onClick={() => setOnly(k)}>
                  {k === 'all' ? t('ALL') : k === 'read' ? t('QUERY') : t('SET')}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full min-w-[720px] border-collapse text-left font-mono text-xs">
              <thead className="bg-muted text-[10px] tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('COMMAND')}</th>
                  <th className="px-3 py-2 font-medium">{t('FUNCTION')}</th>
                  <th className="px-3 py-2 font-medium">{t('STATUS')}</th>
                  <th className="px-3 py-2 font-medium">{t('SOURCE')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">{t('No command matches.')}</td></tr>
                )}
                {rows.map((e, i) => (
                  <tr key={`${e.cmd}-${i}`} className="border-t border-border align-top">
                    <td className="px-3 py-2">
                      <code className="break-all text-foreground select-all">{e.cmd}</code>
                      <span className={cn('ml-2 rounded-sm px-1 text-[9px]', e.set ? 'bg-warn/15 text-warn' : 'bg-accent/15 text-accent')}>{e.set ? t('SET') : t('QUERY')}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-foreground">{lang === 'vi' ? e.vi : e.en}</div>
                      {e.note && <div className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{lang === 'vi' ? e.note.vi : e.note.en}</div>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap"><Badge tone={STATUS[e.status].tone}>{t(STATUS[e.status].label)}</Badge></td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{e.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <AppFooter left="MikMaster — Professional AV Control" right={<><LicenseBadge /><GatewayBadge /></>} />
    </div>
  )
}

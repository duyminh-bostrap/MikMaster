import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { INPUT_SOURCES } from '@/constants/inputs'
import { useProjectActions } from '@/store/hooks'
import type { Projector } from '@/types'
import { t } from '@/i18n'

export function InputPanel({ projector: p, enabled }: { projector: Projector; enabled: boolean }) {
  const { setInput } = useProjectActions()
  return (
    <div>
      <SectionHeader label={t('INPUT SOURCE')} />
      <div className="flex flex-wrap gap-1.5">
        {INPUT_SOURCES.map(source => (
          <Button key={source} variant="accent" selected={p.input === source} disabled={!enabled} className="px-2.5" onClick={() => setInput(p.id, source)}>
            {source}
          </Button>
        ))}
      </div>
    </div>
  )
}

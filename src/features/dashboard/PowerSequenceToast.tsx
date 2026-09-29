import { Power, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useT } from '@/i18n'
import { useProjectState } from '@/store/hooks'
import { cancelPowerSequence, usePowerSequence } from '@/store/powerSequence'

/** Tiến trình "bật lần lượt": máy thứ mấy, máy kế tiếp, đếm ngược; có nút dừng. Hiện ở mọi trang. */
export function PowerSequenceToast() {
  const t = useT()
  const seq = usePowerSequence()
  const { projectors } = useProjectState()
  const [, tick] = useState(0)
  useEffect(() => {
    if (!seq) return
    const id = setInterval(() => tick(n => n + 1), 250)
    return () => clearInterval(id)
  }, [seq])
  if (!seq) return null

  const next = projectors.find(p => p.id === seq.ids[seq.done])
  const seconds = Math.max(0, Math.ceil((seq.nextAt - Date.now()) / 1000))
  const pct = Math.round((seq.done / seq.ids.length) * 100)

  return (
    <div role="status" aria-live="polite" className="fixed right-4 bottom-12 z-40 w-80 overflow-hidden rounded-sm border border-ok/40 bg-card shadow-xl shadow-black/40">
      <div className="flex items-start gap-2.5 p-3">
        <Power size={14} className="mt-0.5 shrink-0 text-ok" />
        <div className="min-w-0 flex-1 font-mono text-xs">
          <p className="text-foreground">{t('Powering on {done}/{total}', { done: seq.done, total: seq.ids.length })}</p>
          <p className="truncate text-muted-foreground">{t('Next: {name} in {s}s', { name: next?.name ?? seq.ids[seq.done] ?? '', s: seconds })}</p>
        </div>
        <Button size="xs" variant="secondary" onClick={cancelPowerSequence} title={t('Stop: the remaining projectors stay off')}>
          <X size={10} />{t('STOP')}
        </Button>
      </div>
      <div className="h-1 bg-muted"><div className="h-full bg-ok transition-all" style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

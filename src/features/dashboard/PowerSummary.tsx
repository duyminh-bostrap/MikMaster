import { Moon, Power } from 'lucide-react'
import type { ReactNode } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useT } from '@/i18n'
import { useSettings } from '@/services/settings'
import { useProjectActions } from '@/store/hooks'
import type { Projector } from '@/types'
import { cn } from '@/utils/cn'
import { connectionStats } from '@/utils/fleet'

/**
 * Hàng điều khiển ở đầu trang All gồm 3 cột: ô BẬT, ô TẮT, và cột 3 (2 hàng, canh phải: thống kê; nút shutter / OSD / test pattern) / từng group, cũng chính là hai nút BẬT TẤT CẢ / TẮT TẤT CẢ: số máy đang bật và số máy tắt / chờ
 * (đang kết nối); bấm ô bật = bật cả nhóm (lần lượt theo cài đặt để tránh sụt điện), bấm ô tắt = tắt cả nhóm (có hỏi xác nhận).
 */
export function PowerSummary({ projectors, scopeLabel, children }: { projectors: Projector[]; scopeLabel: string; /** Cột 3: hai hàng — thống kê (cảnh báo, nhiệt độ…) rồi cụm nút shutter / OSD / test pattern. */ children?: ReactNode }) {
  const t = useT()
  const { setPower } = useProjectActions()
  const { powerOnDelaySec } = useSettings()
  const [confirmDialog, confirm] = useConfirm()
  const s = connectionStats(projectors)
  const ids = projectors.map(p => p.id)
  const n = ids.length
  const stagger = n > 1 && powerOnDelaySec > 0

  async function allOff() {
    if (await confirm({ title: t('TURN OFF PROJECTORS'), message: t('Turn off all {n} projectors in "{booth}"? Their image goes dark.', { n, booth: scopeLabel }), confirmLabel: t('TURN OFF') })) {
      setPower(ids, 'standby')
    }
  }

  const base = 'flex w-56 min-w-0 shrink-0 items-center gap-4 rounded-sm border px-5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50'
  return (
    <div role="group" aria-label={t('Power summary')} data-testid="power-summary" className="flex shrink-0 flex-wrap items-stretch gap-x-3 gap-y-3 border-b border-border bg-background px-5 py-3">
      <button type="button" data-testid="summary-on" disabled={n === 0} onClick={() => setPower(ids, 'on')}
        aria-label={stagger ? t('All on — one by one, {s} s apart (Settings)', { s: powerOnDelaySec }) : t('All on')}
        className={cn(base, 'border-ok/50 bg-ok/5 hover:bg-ok/15')}>
        <Power size={30} strokeWidth={2.25} className="shrink-0 text-ok" />
        <span className="flex min-w-0 flex-col">
          <span className="font-mono text-3xl leading-none font-bold text-ok tabular-nums">{s.on}</span>
          <span className="mt-1 font-mono text-[10px] tracking-[0.1em] text-muted-foreground">{t('POWER ON')}</span>
          {s.warmup > 0 && <span data-testid="summary-warmup" className="truncate font-mono text-[10px] text-warn">{t('{n} warming up', { n: s.warmup })}</span>}
          {stagger && <span className="truncate font-mono text-[10px] text-ok/80">{t('{s} s apart', { s: powerOnDelaySec })}</span>}
        </span>
      </button>
      <button type="button" data-testid="summary-off" disabled={n === 0} onClick={() => void allOff()} aria-label={t('All off')}
        className={cn(base, 'border-border bg-card hover:border-danger/50 hover:bg-danger/10')}>
        <Moon size={30} strokeWidth={2.25} className="shrink-0 text-foreground" />
        <span className="flex min-w-0 flex-col">
          <span className="font-mono text-3xl leading-none font-bold text-foreground tabular-nums">{s.off}</span>
          <span className="mt-1 font-mono text-[10px] tracking-[0.1em] text-muted-foreground">{t('OFF / STANDBY')}</span>
          {s.cooling > 0 && <span data-testid="summary-cooling" className="truncate font-mono text-[10px] text-accent">{t('{n} cooling down', { n: s.cooling })}</span>}
        </span>
      </button>
      {/* Cột 3: các hàng điều khiển / thống kê (truyền vào). */}
      {children && <div data-testid="summary-column3" className="flex min-w-[22rem] flex-1 flex-col justify-center gap-2.5">{children}</div>}
      {confirmDialog}
    </div>
  )
}

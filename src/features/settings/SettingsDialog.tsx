import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useT } from '@/i18n'
import { POWER_ON_DELAY_LIMITS, updateSettings, useSettings, type Language, type ThemeSetting } from '@/services/settings'

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex gap-1.5">
        {options.map(o => (
          <Button key={o.value} role="radio" aria-checked={value === o.value} variant="accent" selected={value === o.value} className="flex-1" onClick={() => onChange(o.value)}>
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

/** Cài đặt áp dụng ngay (theme, ngôn ngữ, khoảng cách bật máy); lưu trong trình duyệt này. */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const t = useT()
  const s = useSettings()
  return (
    <Modal title={t('SETTINGS')} onClose={onClose} onSubmit={onClose}
      footer={<Button type="submit" variant="primary" className="ml-auto px-6">{t('DONE')}</Button>}>
      <Segmented<ThemeSetting> label={t('THEME')} value={s.theme} onChange={theme => updateSettings({ theme })}
        options={[{ value: 'dark', label: t('Dark') }, { value: 'light', label: t('Light') }, { value: 'system', label: t('System') }]} />
      <Segmented<Language> label={t('LANGUAGE')} value={s.language} onChange={language => updateSettings({ language })}
        options={[{ value: 'en', label: 'English' }, { value: 'vi', label: 'Tiếng Việt' }]} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="power-delay" className="font-mono text-xs text-muted-foreground">{t('DELAY BETWEEN POWER-ONS')}</label>
        <div className="flex items-center gap-3">
          <input id="power-delay" type="range" min={POWER_ON_DELAY_LIMITS.min} max={POWER_ON_DELAY_LIMITS.max} step={1} value={s.powerOnDelaySec}
            onChange={e => updateSettings({ powerOnDelaySec: Number(e.target.value) })} className="flex-1 accent-primary" />
          <input aria-label={t('Seconds')} type="number" min={POWER_ON_DELAY_LIMITS.min} max={POWER_ON_DELAY_LIMITS.max} value={s.powerOnDelaySec}
            onChange={e => updateSettings({ powerOnDelaySec: Number(e.target.value) })}
            className="w-16 rounded-sm border border-border bg-muted px-2 py-1 text-right font-mono text-sm text-foreground outline-none focus:border-primary/60" />
          <span className="font-mono text-xs text-muted-foreground">{t('sec')}</span>
        </div>
        <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
          {s.powerOnDelaySec > 0
            ? t('ALL ON turns projectors on one by one, {n} s apart, so their start-up current does not trip the power.', { n: s.powerOnDelaySec })
            : t('ALL ON turns every projector on at the same time.')}
        </p>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground/70">{t('Settings are stored in this browser.')}</p>
    </Modal>
  )
}

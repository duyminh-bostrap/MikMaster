import { TextInput } from '@/components/ui/Field'
import { useT } from '@/i18n'
import { useId, useState } from 'react'

/**
 * Cổng điều khiển: bình thường là cổng mặc định của giao thức nên ẩn đi, chỉ hiện "Cổng 1024 (mặc định) · Đổi".
 * Mở sẵn khi máy dùng cổng khác mặc định (ai đó đã đổi trong cài đặt của máy chiếu).
 */
export function PortField({ value, defaultPort, onChange, invalid }: { value: string; defaultPort: number; onChange: (v: string) => void; invalid?: boolean }) {
  const t = useT()
  const isDefault = Number(value) === defaultPort
  const [open, setOpen] = useState(!isDefault)
  const id = useId()
  if (!open && isDefault && !invalid) {
    return (
      <p className="font-mono text-[10px] text-muted-foreground">
        {t('Port {port} (default)', { port: defaultPort })} ·{' '}
        <button type="button" onClick={() => setOpen(true)} className="text-accent hover:underline">{t('Change')}</button>
      </p>
    )
  }
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
      <label htmlFor={id}>{t('PORT')}</label>
      <TextInput id={id} value={value} invalid={invalid} inputMode="numeric" onChange={e => onChange(e.target.value)} className="w-24 px-2 py-1 text-xs" />
      {!isDefault && <button type="button" onClick={() => onChange(String(defaultPort))} className="text-accent hover:underline">{t('Use default ({port})', { port: defaultPort })}</button>}
    </div>
  )
}

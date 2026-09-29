import { Check, Loader2, SearchX } from 'lucide-react'
import { getProtocolOption } from '@/constants/protocols'
import { useT } from '@/i18n'
import { modelLabel, type IdentifyState } from './useIdentify'

/** Dòng nhỏ dưới ô IP: đang dò / đã nhận ra máy gì / không thấy. */
export function IdentifyStatus({ state }: { state: IdentifyState }) {
  const t = useT()
  const line = 'flex items-center gap-1.5 font-mono text-[10px] leading-relaxed'
  switch (state.status) {
    case 'idle': return null
    case 'unavailable': return <p className={`${line} text-muted-foreground`}>{t('Auto-detect needs the gateway (simulated mode).')}</p>
    case 'checking': return <p className={`${line} text-muted-foreground`}><Loader2 size={10} className="animate-spin" />{t('Detecting the projector…')}</p>
    case 'none': return <p className={`${line} text-warn`}><SearchX size={10} />{t('No projector answered at this IP — check it, or choose the protocol yourself.')}</p>
    case 'error': return <p className={`${line} text-danger`}>{state.message}</p>
    case 'found': {
      const r = state.result
      return (
        <p className={`${line} text-ok`}>
          <Check size={10} strokeWidth={3} />
          {t('Found: {model} ({protocol})', { model: modelLabel(r) || t('unknown model'), protocol: getProtocolOption(r.protocol!).label })}
          {r.authRequired && <span className="text-warn">· {t('needs a login')}</span>}
        </p>
      )
    }
  }
}

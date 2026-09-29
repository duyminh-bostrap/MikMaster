import { useEffect } from 'react'
import { useSettings } from '@/services/settings'

/** Gắn theme (và ngôn ngữ) lên <html>; "system" theo cài đặt sáng/tối của máy. */
export function ThemeSync() {
  const { theme, language } = useSettings()
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'light' : 'dark') : theme
      document.documentElement.dataset.theme = resolved
      document.documentElement.style.colorScheme = resolved
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#F4F6F9' : '#0B0E14')
    }
    apply()
    if (theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => { document.documentElement.lang = language }, [language])
  return null
}

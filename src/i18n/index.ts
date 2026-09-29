import { useCallback } from 'react'
import { getSettings, useSettings, type Language } from '@/services/settings'
import { VI } from './vi'

export type Vars = Record<string, string | number>

/**
 * Dịch giao diện. Khoá là chuỗi tiếng Anh (nên thiếu bản dịch vẫn hiện tiếng Anh, không bao giờ hiện khoá lạ).
 * Biến: t('{n} devices', { n: 3 }). Log thiết bị, lỗi từ máy chiếu và lệnh RAW giữ nguyên tiếng Anh.
 */
export function translate(language: Language, key: string, vars?: Vars): string {
  let text = language === 'vi' ? (VI[key] ?? key) : key
  // Tiếng Anh: "(s)" / "(es)" theo biến n — "1 DEVICE", "6 DEVICES".
  if (vars && typeof vars.n === 'number') text = text.replace(/\((s|S|es|ES)\)/g, (_, suffix: string) => (vars.n === 1 ? '' : suffix))
  return vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text
}

export type Translate = (key: string, vars?: Vars) => string

export function useT(): Translate {
  const { language } = useSettings()
  return useCallback((key: string, vars?: Vars) => translate(language, key, vars), [language])
}

/** Ngoài component (hiếm khi cần). */
export const t: Translate = (key, vars) => translate(getSettings().language, key, vars)

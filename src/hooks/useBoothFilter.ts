import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import type { Booth } from '@/types'

export const ALL_BOOTHS = 'all'

/** Booth đang lọc được giữ trên URL (?booth=...) để sidebar và tab dùng chung và quay lại từ Detail vẫn giữ lọc. */
export function useBoothFilter(booths: Booth[]): [string, (boothId: string) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('booth')
  const active = raw && booths.some(b => b.id === raw) ? raw : ALL_BOOTHS

  const setActive = useCallback(
    (boothId: string) => {
      setParams(boothId === ALL_BOOTHS ? {} : { booth: boothId }, { replace: true })
    },
    [setParams],
  )
  return [active, setActive]
}

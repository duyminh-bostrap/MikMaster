import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { usePref } from '@/services/prefs'
import type { Booth } from '@/types'

export const ALL_BOOTHS = 'all'

/**
 * Booth đang lọc được giữ trên URL (?booth=...) để sidebar và tab dùng chung và quay lại từ Detail vẫn giữ lọc.
 * Có `projectId` thì lựa chọn cũng được nhớ cho lần mở project sau (URL không có booth → dùng group đã nhớ).
 */
export function useBoothFilter(booths: Booth[], projectId?: string): [string, (boothId: string) => void] {
  const [params, setParams] = useSearchParams()
  const [lastGroup, setLastGroup] = usePref('lastGroup')
  const raw = params.get('booth')
  const stored = projectId ? lastGroup[projectId] : undefined
  const pick = raw ?? stored
  const active = pick && booths.some(b => b.id === pick) ? pick : ALL_BOOTHS

  const setActive = useCallback(
    (boothId: string) => {
      setParams(boothId === ALL_BOOTHS ? {} : { booth: boothId }, { replace: true })
      if (projectId) setLastGroup({ ...lastGroup, [projectId]: boothId })
    },
    [setParams, projectId, lastGroup, setLastGroup],
  )
  return [active, setActive]
}

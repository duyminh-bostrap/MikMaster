import { useSyncExternalStore } from 'react'

/**
 * Bật nhiều máy lần lượt, cách nhau `delayMs`, để dòng khởi động của các máy chiếu không cộng dồn
 * làm sụt điện / nhảy aptomat. Chỉ một chuỗi chạy tại một thời điểm; lệnh tắt huỷ chuỗi đang chạy.
 */
export interface PowerSequence {
  ids: string[]
  /** Số máy đã bật. */
  done: number
  delayMs: number
  /** Thời điểm (ms) bật máy kế tiếp. */
  nextAt: number
}

let state: PowerSequence | null = null
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

export function startPowerOnSequence(ids: string[], delayMs: number, powerOn: (id: string) => void): void {
  cancelPowerSequence()
  if (ids.length <= 1 || delayMs <= 0) {
    ids.forEach(powerOn)
    return
  }
  // Luôn đọc hàng chờ từ `state` (không từ closure) để máy bị gỡ khỏi hàng chờ giữa chừng không bị bật nữa.
  const step = () => {
    if (!state) return
    powerOn(state.ids[state.done]!)
    const done = state.done + 1
    if (done >= state.ids.length) {
      state = null
      timer = undefined
    } else {
      state = { ...state, done, nextAt: Date.now() + delayMs }
      timer = setTimeout(step, delayMs)
    }
    emit()
  }
  state = { ids, done: 0, delayMs, nextAt: Date.now() }
  step()
}

export function cancelPowerSequence(): void {
  clearTimeout(timer)
  timer = undefined
  if (state) {
    state = null
    emit()
  }
}

/** Máy còn đang chờ bật trong chuỗi (để lệnh tắt những máy đó cũng gỡ chúng khỏi hàng chờ). */
export function removeFromPowerSequence(ids: readonly string[]): void {
  if (!state) return
  const pending = state.ids.slice(state.done)
  if (pending.every(id => ids.includes(id))) return cancelPowerSequence()
  state = { ...state, ids: [...state.ids.slice(0, state.done), ...pending.filter(id => !ids.includes(id))] }
  emit()
}

export function getPowerSequence(): PowerSequence | null {
  return state
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function usePowerSequence(): PowerSequence | null {
  return useSyncExternalStore(subscribe, getPowerSequence, getPowerSequence)
}

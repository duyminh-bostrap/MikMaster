import { useState, type DragEvent, type HTMLAttributes, type ReactNode } from 'react'

/** Kéo thả máy chiếu sang booth khác: dữ liệu kéo là id máy chiếu. */
const DRAG_TYPE = 'application/x-mikmaster-projector'

export function projectorDragProps(id: string) {
  return {
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.setData(DRAG_TYPE, id)
      e.dataTransfer.effectAllowed = 'move'
    },
  }
}

/** Gắn vào booth (sidebar / tab): sáng lên khi có máy chiếu kéo qua, thả → `onDrop(id)`. */
export function useBoothDropTarget(onDrop: (projectorId: string) => void, disabled = false) {
  const [over, setOver] = useState(false)
  const accepts = (e: DragEvent) => e.dataTransfer.types.includes(DRAG_TYPE)
  return {
    over,
    props: {
      onDragOver: (e: DragEvent) => {
        if (disabled || !accepts(e)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (!over) setOver(true)
      },
      onDragLeave: (e: DragEvent) => {
        // Bỏ qua khi con trỏ chỉ đi qua phần tử con.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false)
      },
      onDrop: (e: DragEvent) => {
        setOver(false)
        const id = e.dataTransfer.getData(DRAG_TYPE)
        if (id) { e.preventDefault(); onDrop(id) }
      },
    },
  }
}

/** Vùng thả máy chiếu vào một booth; `children` nhận cờ `over` để tô sáng. */
export function BoothDropZone({ onDrop, disabled, children, ...rest }: Omit<HTMLAttributes<HTMLDivElement>, 'onDrop' | 'children'> & {
  onDrop: (projectorId: string) => void
  disabled?: boolean
  children: (over: boolean) => ReactNode
}) {
  const { over, props } = useBoothDropTarget(onDrop, disabled)
  return <div {...rest} {...props}>{children(over)}</div>
}

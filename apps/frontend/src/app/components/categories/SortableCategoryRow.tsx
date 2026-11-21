import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  id: number
  children: ReactNode
  disabled?: boolean
}

export function SortableCategoryRow({ id, children, disabled = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
    transition: {
      duration: 250,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  })

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        position: 'relative',
        zIndex: isDragging ? 10 : undefined,
      }}
      className={isDragging ? 'bg-blue-50 shadow-md opacity-80' : 'hover:bg-gray-50/70'}
    >
      <td className="p-3 text-gray-400">
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={disabled}
          className="cursor-grab active:cursor-grabbing touch-none disabled:cursor-not-allowed"
          aria-label="Geser kategori"
        >
          <GripVertical size={16} />
        </button>
      </td>

      {children}
    </tr>
  )
}

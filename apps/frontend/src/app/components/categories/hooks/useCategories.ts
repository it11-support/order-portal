import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { api, swrFetcher } from '@lib'
import type { ApiResponse, Category } from '@repo/shared'

const EMPTY_FORM = {
  code: '',
  name: '',
  icon: '',
  sortOrder: 0,
  isActive: true,
}

type CategoryForm = typeof EMPTY_FORM
type Direction = 'up' | 'down'

export const useCategories = () => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryForm>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [targetIndex, setTargetIndex] = useState<number | null>(null)

  const tableRef = useRef<HTMLTableElement>(null)
  const busyRef = useRef(false)

  const { data, isLoading, mutate } = useSWR<ApiResponse<Category>>('/categories', swrFetcher)

  const categories = useMemo(() => data?.data ?? [], [data])

  const updateForm = useCallback((values: Partial<CategoryForm>) => {
    setForm((prev) => ({ ...prev, ...values }))
  }, [])

  const openCreate = useCallback(() => {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((category: Category) => {
    setEditing(category)
    setForm({
      code: category.code,
      name: category.name,
      icon: category.icon ?? '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    })
    setDialogOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.code.trim() || !form.name.trim() || busyRef.current) {
      return
    }

    busyRef.current = true
    setSaving(true)

    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, form)
      } else {
        await api.post('/categories', form)
      }

      await mutate()
      setDialogOpen(false)
      toast.success('Kategori berhasil disimpan')
    } catch (error) {
      console.error(error)
      toast.error('Gagal menyimpan kategori')
    } finally {
      busyRef.current = false
      setSaving(false)
    }
  }, [editing, form, mutate])

  const handleDelete = useCallback(
    async (id: number) => {
      if (busyRef.current || !window.confirm('Hapus kategori ini?')) {
        return
      }

      busyRef.current = true
      setSaving(true)

      try {
        await api.delete(`/categories/${id}`)

        await mutate(
          (current) =>
            current
              ? {
                  ...current,
                  data: current.data.filter((cat) => cat.id !== id),
                }
              : current,
          { revalidate: false },
        )

        toast.success('Kategori berhasil dihapus')
      } catch (error) {
        console.error(error)
        toast.error('Gagal menghapus kategori')
        await mutate()
      } finally {
        busyRef.current = false
        setSaving(false)
      }
    },
    [mutate],
  )

  const saveOrder = useCallback(
    async (items: Category[]) => {
      if (busyRef.current) return

      busyRef.current = true
      setSaving(true)

      const reordered = items.map((category, index) => ({
        ...category,
        sortOrder: index + 1,
      }))

      try {
        await mutate((current) => (current ? { ...current, data: reordered } : current), {
          revalidate: false,
        })

        await api.put('/categories/reorder/batch', {
          orders: reordered.map(({ id, sortOrder }) => ({
            id,
            sortOrder,
          })),
        })

        await mutate()
      } catch (error) {
        console.error(error)
        toast.error('Gagal mengubah urutan kategori')
        await mutate()
      } finally {
        busyRef.current = false
        setSaving(false)
      }
    },
    [mutate],
  )

  const moveCategory = useCallback(
    async (index: number, direction: Direction) => {
      const newIndex = direction === 'up' ? index - 1 : index + 1

      if (busyRef.current || newIndex < 0 || newIndex >= categories.length) {
        return
      }

      const updated = [...categories]
      const [moved] = updated.splice(index, 1)
      updated.splice(newIndex, 0, moved)

      await saveOrder(updated)
    },
    [categories, saveOrder],
  )

  const handleGripMouseDown = useCallback((event: ReactMouseEvent, index: number) => {
    if (busyRef.current || event.button !== 0) return

    event.preventDefault()
    event.stopPropagation()

    setDragIndex(index)
    setTargetIndex(index)
  }, [])

  useEffect(() => {
    if (dragIndex === null) return

    const previousUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    const handleMouseMove = (event: MouseEvent) => {
      const rows = tableRef.current?.querySelectorAll<HTMLTableRowElement>(
        'tbody tr[data-category-id]',
      )

      if (!rows?.length) return

      let newTarget = categories.length - 1

      for (let index = 0; index < rows.length; index++) {
        const rect = rows[index].getBoundingClientRect()
        const middle = rect.top + rect.height / 2

        if (event.clientY < middle) {
          newTarget = index
          break
        }
      }

      setTargetIndex((prev) => (prev === newTarget ? prev : newTarget))
    }

    const handleMouseUp = () => {
      if (targetIndex !== null && dragIndex !== targetIndex) {
        const updated = [...categories]
        const [moved] = updated.splice(dragIndex, 1)
        updated.splice(targetIndex, 0, moved)

        void saveOrder(updated)
      }

      setDragIndex(null)
      setTargetIndex(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.body.style.userSelect = previousUserSelect
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragIndex, targetIndex, categories, saveOrder])

  return {
    categories,
    categoriesLoading: isLoading,
    saving,

    dialogOpen,
    setDialogOpen,
    editing,
    form,
    updateForm,

    openCreate,
    openEdit,
    handleSave,
    handleDelete,

    moveCategory,
    dragIndex,
    targetIndex,
    tableRef,
    handleGripMouseDown,
    saveOrder,
  }
}

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { api } from '@lib'
import { Category } from '@repo/shared'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Switch } from '@/app/components/ui/switch'
import IconPicker from './IconPicker'
import CategoryIcon from './CategoryIcon'
import { toast } from 'sonner'

const EMPTY_FORM = {
  code: '',
  name: '',
  icon: '',
  sortOrder: 0,
  isActive: true,
}

const CategoryList: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [orderChanged, setOrderChanged] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [targetIndex, setTargetIndex] = useState<number | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const res = await api.get('/categories')
      setCategories(res.data.data)
      setOrderChanged(false)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    setForm({
      code: cat.code,
      name: cat.name,
      icon: cat.icon || '',
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.code || !form.name) return
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, form)
      } else {
        await api.post('/categories', form)
      }
      setDialogOpen(false)
      fetchCategories()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus kategori ini?')) return
    try {
      await toast.promise(api.delete(`/categories/${id}`), {
        loading: 'Menghapus kategori...',
        success: 'Kategori berhasil dihapus',
        error: 'Gagal menghapus kategori',
      })
      fetchCategories()
    } catch (e) {
      console.error(e)
    }
  }

  const displayCategories = useMemo(() => {
    if (dragIndex === null || targetIndex === null || dragIndex === targetIndex) {
      return categories
    }
    const result = [...categories]
    const [moved] = result.splice(dragIndex, 1)
    result.splice(targetIndex, 0, moved)
    return result
  }, [categories, dragIndex, targetIndex])

  const handleGripMouseDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault()
    setDragIndex(index)
    setTargetIndex(index)
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragIndex === null || !tableRef.current) return
      const rows = tableRef.current.querySelectorAll('tbody tr')
      let newTarget: number | null = null
      rows.forEach((row, index) => {
        const rect = (row as HTMLElement).getBoundingClientRect()
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          newTarget = index
        }
      })
      if (newTarget !== null && newTarget !== targetIndex) {
        setTargetIndex(newTarget)
      }
    },
    [dragIndex, targetIndex],
  )

  const handleMouseUp = useCallback(async () => {
    if (dragIndex !== null && targetIndex !== null && dragIndex !== targetIndex) {
      const updated = [...categories]
      const [moved] = updated.splice(dragIndex, 1)

      updated.splice(targetIndex, 0, moved)

      const reordered = updated.map((c, i) => ({
        ...c,
        sortOrder: i + 1,
      }))

      setCategories(reordered)
      setOrderChanged(true)

      await saveOrder(reordered)
    }

    setDragIndex(null)
    setTargetIndex(null)
  }, [dragIndex, targetIndex, categories])

  useEffect(() => {
    if (dragIndex !== null) {
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragIndex, handleMouseMove, handleMouseUp])

  const saveOrder = async (items: Category[]) => {
    setSaving(true)

    try {
      const orders = items.map((c) => ({
        id: c.id,
        sortOrder: c.sortOrder,
      }))

      await api.put('/categories/reorder/batch', { orders })

      setOrderChanged(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Kategori</h1>
          <p className="text-xs text-gray-500">Geser baris untuk mengubah urutan</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreate} className="gap-2">
            <Plus size={16} />
            Tambah
          </Button>
        </div>
      </div>

      <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table ref={tableRef} className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-3 w-10" />
                <th className="p-3">Kode</th>
                <th className="p-3">Nama</th>
                <th className="p-3 w-20 text-center">Ikon</th>
                <th className="p-3 w-24 text-center">Status</th>
                <th className="p-3 w-28 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {displayCategories.map((cat, index) => (
                <tr
                  key={cat.id}
                  onMouseDown={(e) =>
                    handleGripMouseDown(
                      e,
                      categories.findIndex((c) => c.id === cat.id),
                    )
                  }
                  className={`transition-all cursor-grab active:cursor-grabbing duration-150 hover:bg-gray-50/70 ${
                    dragIndex !== null && dragIndex === categories.findIndex((c) => c.id === cat.id)
                      ? 'opacity-30 bg-accent/5'
                      : ''
                  }`}
                >
                  <td className="p-3 text-gray-400">
                    <GripVertical
                      size={16}
                      className="cursor-grab active:cursor-grabbing"
                      onMouseDown={(e) =>
                        handleGripMouseDown(
                          e,
                          categories.findIndex((c) => c.id === cat.id),
                        )
                      }
                    />
                  </td>
                  <td className="p-3">
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                      {cat.code}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{cat.name}</td>
                  <td className="p-3 text-center">
                    {cat.icon ? (
                      <CategoryIcon name={cat.icon} size={20} className="text-emerald-600" />
                    ) : (
                      '-'
                    )}
                  </td>

                  <td className="p-3 text-center">
                    {cat.isActive ? (
                      <span className="inline-flex text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold border border-green-100">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-100">
                        Non-Aktif
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && categories.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-sm text-gray-400">
                    Tidak ada data kategori.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-sm text-gray-400">
                    Memuat...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Ubah data kategori.' : 'Buat kategori baru.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="CONTOH: DAIRY"
                disabled={!!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama kategori"
              />
            </div>
            <div className="space-y-2">
              <Label>Ikon</Label>
              <IconPicker value={form.icon} onChange={(icon) => setForm({ ...form, icon })} />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Aktif
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.code || !form.name}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CategoryList

import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableCategoryRow } from './SortableCategoryRow'
import CategoryIcon from './CategoryIcon'
import { Pencil, Trash2 } from 'lucide-react'
import { Loader } from '../common'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useCategories } from './hooks'

type CategoryTableProps = {
  cat: ReturnType<typeof useCategories>
}
const CategoryTable = (props: CategoryTableProps) => {
  const { saveOrder, categories, categoriesLoading, tableRef, saving, openEdit, handleDelete } =
    props.cat
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = categories.findIndex((cat) => cat.id === active.id)
    const newIndex = categories.findIndex((cat) => cat.id === over.id)

    if (oldIndex < 0 || newIndex < 0) return

    await saveOrder(arrayMove(categories, oldIndex, newIndex))
  }

  return (
    <div className="hidden md:block w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={categories.map((cat) => cat.id)}
            strategy={verticalListSortingStrategy}
          >
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
                {categories.map((cat) => (
                  <SortableCategoryRow key={cat.id} id={cat.id} disabled={saving}>
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
                  </SortableCategoryRow>
                ))}

                {!categoriesLoading && categories.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-sm text-gray-400">
                      Tidak ada data kategori.
                    </td>
                  </tr>
                )}
                {categoriesLoading && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <Loader label="Memuat..." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}

export default CategoryTable

import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react'
import { Loader } from '../common'
import CategoryIcon from './CategoryIcon'
import { useCategories } from './hooks'

type CategoryTableMobileProps = {
  cat: ReturnType<typeof useCategories>
}
const CategoryTableMobile = (props: CategoryTableMobileProps) => {
  const { categoriesLoading, categories, saving, moveCategory, openEdit, handleDelete } = props.cat
  return (
    <div className="md:hidden space-y-3">
      {categoriesLoading && categories.length === 0 ? (
        <Loader label="Memuat..." className="py-12" />
      ) : (
        <>
          {categories.map((cat, index) => (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                    {cat.code}
                  </span>
                  <div className="flex items-center gap-2 mt-1 min-w-0">
                    {cat.icon && (
                      <CategoryIcon
                        name={cat.icon}
                        size={20}
                        className="text-emerald-600 shrink-0"
                      />
                    )}
                    <p className="font-medium text-sm truncate">{cat.name}</p>
                  </div>
                </div>
                {cat.isActive ? (
                  <span className="inline-flex text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold border border-green-100 shrink-0">
                    Aktif
                  </span>
                ) : (
                  <span className="inline-flex text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-100 shrink-0">
                    Non-Aktif
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-1 pt-2 border-t border-gray-200">
                <button
                  onClick={() => moveCategory(index, 'up')}
                  disabled={index === 0 || saving}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Naik"
                >
                  <ArrowUp size={18} />
                </button>
                <button
                  onClick={() => moveCategory(index, 'down')}
                  disabled={index === categories.length - 1 || saving}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Turun"
                >
                  <ArrowDown size={18} />
                </button>
                <button
                  onClick={() => openEdit(cat)}
                  className="p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  aria-label="Edit"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {!categoriesLoading && categories.length === 0 && (
            <p className="text-center py-12 text-sm text-muted-foreground">
              Tidak ada data kategori.
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default CategoryTableMobile

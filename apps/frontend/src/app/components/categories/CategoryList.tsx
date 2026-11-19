import React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/app/components/ui/button'

import { useCategories } from './hooks'
import CategoryFormDialog from './CategoryFormDialog'
import CategoryTable from './CategoryTable'
import CategoryTableMobile from './CategoryTableMobile'

const CategoryList: React.FC = () => {
  const cat = useCategories()
  const { openCreate } = cat

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

      <CategoryTableMobile cat={cat} />

      {/* TABLE VIEW — desktop only */}
      <CategoryTable cat={cat} />
      <CategoryFormDialog cat={cat} />
    </div>
  )
}

export default CategoryList

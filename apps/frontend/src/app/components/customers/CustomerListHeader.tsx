import { Search, X } from 'lucide-react'
import { useCustomerList } from './hooks'

type CustomerListHeaderProps = {
  customerList: ReturnType<typeof useCustomerList>
}

const CustomerListHeader = ({ customerList }: CustomerListHeaderProps) => {
  const { search, setSearch, handleClearSearch } = customerList
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Daftar Pelanggan</h1>
      </div>

      <div className="relative flex w-full items-center md:w-80">
        <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-gray-400" />

        <input
          type="text"
          placeholder="Cari Kode / Nama Pelanggan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-10 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />

        {search !== '' && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default CustomerListHeader

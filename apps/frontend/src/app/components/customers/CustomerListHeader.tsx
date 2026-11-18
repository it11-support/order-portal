import { Search, X } from 'lucide-react'
import { useCustomerList } from './hooks/useCustomerList'

const CustomerListHeader = () => {
  const { search, setSearch, showInactive, setShowInactive, handleClearSearch } = useCustomerList()
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Daftar Pelanggan</h1>
        <p className="text-xs text-gray-500"></p>
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none py-2">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2 cursor-pointer transition-colors"
        />
        <span className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
          Tampilkan pelanggan non-aktif
        </span>
      </label>
      <div className="w-full md:w-80 relative flex items-center">
        {/* Ikon Kaca Pembesar di Sisi Kiri Input */}
        <Search className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none" />

        <input
          type="text"
          placeholder="Cari Kode / Nama Pelanggan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all"
        />

        {/* Tombol X Icon: Hanya muncul jika ada teks di dalam kotak search */}
        {search !== '' && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default CustomerListHeader

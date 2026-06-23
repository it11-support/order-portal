import React, { useEffect, useState, useRef, useCallback } from 'react'
import useSWRInfinite, { SWRInfiniteKeyLoader } from 'swr/infinite'
import { AxiosRequestConfig } from 'axios'
import { swrFetcher } from '@lib/fetcher'
import { useIntersectionObserver } from '@hooks/useIntersectionObserver'
import { InfiniteScrollWatcher } from '@/app/components/common/InfiniteScrollWatcher'
import { Customer, ApiResponse, DEFAULT_LIMIT } from '@repo/shared'
import { Search, X } from 'lucide-react'

const CustomerList: React.FC = () => {
  const [search, setSearch] = useState<string>('')
  const [showInactive, setShowInactive] = useState<boolean>(false)
  const limit = DEFAULT_LIMIT
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)

    return () => clearTimeout(t)
  }, [search])

  const getKey = (pageIndex: number, previousPageData: ApiResponse<Customer>) => {
    if (previousPageData && previousPageData.data.length === 0) return null

    return `/customers?page=${pageIndex + 1}&limit=${limit}&search=${debouncedSearch}&showInactive=${showInactive}`
  }

  const handleClearSearch = () => setSearch('')

  const {
    data: pages,
    size,
    setSize,
    error,
    isLoading,
    isValidating,
  } = useSWRInfinite<ApiResponse<Customer>>(getKey, swrFetcher, {
    revalidateFirstPage: false,
  })

  const customers: Customer[] = pages
    ? pages.reduce<Customer[]>((acc, page) => acc.concat(page.data), [])
    : []

  const isEmpty = pages?.[0]?.data?.length === 0
  const isReachingEnd = isEmpty || (pages && pages[pages.length - 1]?.data?.length < limit) || false
  const isFetching = isLoading || isValidating

  const observerTargetRef = useIntersectionObserver({
    enabled: !isReachingEnd && !isFetching,
    onIntersect: () => {
      setSize((prev) => prev + 1)
    },
    rootMargin: '0px 0px -120px 0px',
    threshold: 0,
  })
  return (
    <div className="p-4 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* HEADER & SEARCH BAR */}
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
            Tampilkan pelanggan tidak aktif
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

      <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="p-4">Nama Pelanggan</th>
                <th className="p-4 w-44">Grup</th>
                <th className="p-4 w-44">SubGroub</th>
                <th className="p-4">Area</th>
                <th className="p-4 w-28 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {/* Jika data pelanggan ada, render baris demi baris */}
              {customers.length > 0 &&
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className={`hover:bg-gray-50/70 transition-colors ${
                      customer.NonActive === 'Y' ? 'bg-gray-50/40 text-gray-400' : ''
                    }`}
                  >
                    <td className="p-4">
                      <div className="font-medium">{customer.CardName}</div>
                      {customer.Address && (
                        <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                          {customer.Address}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">
                        {customer.GroupName || 'Umum'}
                      </span>
                    </td>
                    <td className="p-4">
                      {customer.Subgroup?.IndName && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">
                          {customer.Subgroup?.IndName || null}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-500">{customer.City || '-'}</td>
                    <td className="p-4 text-center">
                      {customer.NonActive === 'Y' ? (
                        <span className="inline-flex text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-100">
                          Non-Aktif
                        </span>
                      ) : (
                        <span className="inline-flex text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold border border-green-100">
                          Aktif
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

              {/* JIKA DATA MEMANG KOSONG */}
              {isEmpty && !isLoading && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-sm text-gray-400">
                    Tidak ada data yang ditemukan.
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={5} className="p-0">
                  <InfiniteScrollWatcher
                    ref={observerTargetRef}
                    isLoading={isLoading}
                    isValidating={isValidating}
                    isReachingEnd={isReachingEnd}
                    isEmpty={isEmpty}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default CustomerList

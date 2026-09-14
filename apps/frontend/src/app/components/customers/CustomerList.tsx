import React, { useEffect, useState, useRef } from 'react'
import useSWRInfinite from 'swr/infinite'
import { api, swrFetcher } from '@lib'
import { useAuth } from '@/app/contexts/AuthContext'
import { useIntersectionObserver } from '@hooks'
import { InfiniteScrollWatcher } from '@/app/components/common/InfiniteScrollWatcher'
import { Customer, ApiResponse, DEFAULT_LIMIT } from '@repo/shared'
import { Check, Copy, Eye, EyeOff, Search, X } from 'lucide-react'

const CustomerCredentials = ({
  username,
  password,
}: {
  username: string
  password?: string | null
}) => {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [usernameCopied, setUsernameCopied] = useState(false)
  const [copyError, setCopyError] = useState('')

  const copyPassword = async () => {
    if (!password) return
    setCopyError('')
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
    } catch {
      setCopyError('Gagal menyalin. Silakan salin password secara manual.')
    }
  }

  const copyUsername = async () => {
    setCopyError('')
    try {
      await navigator.clipboard.writeText(username)
      setUsernameCopied(true)
    } catch {
      setCopyError('Gagal menyalin username secara manual.')
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span>
          Username: <code className="font-mono font-semibold select-all">{username || '-'}</code>
        </span>
        {username && (
          <button
            type="button"
            aria-label={usernameCopied ? 'Username tersalin' : 'Salin username'}
            title={usernameCopied ? 'Username tersalin' : 'Salin username'}
            onClick={copyUsername}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            {usernameCopied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
          </button>
        )}
        <span role="status" className="sr-only">
          {usernameCopied ? 'Username tersalin' : ''}
        </span>
      </div>
      {password ? (
        <div className="flex items-center gap-2">
          <span>
            Password:{' '}
            <code className={`font-mono font-semibold ${visible ? 'select-all' : ''}`}>
              {visible ? password : '••••••'}
            </code>
          </span>
          <button
            type="button"
            aria-label={visible ? 'Sembunyikan password' : 'Lihat password'}
            title={visible ? 'Sembunyikan password' : 'Lihat password'}
            aria-pressed={visible}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            onClick={() => {
              setVisible(!visible)
              setCopied(false)
              setCopyError('')
            }}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          {visible && (
            <button
              type="button"
              aria-label={copied ? 'Password tersalin' : 'Salin password'}
              title={copied ? 'Password tersalin' : 'Salin password'}
              onClick={copyPassword}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
            </button>
          )}
          <span role="status" className="sr-only">
            {visible && copied ? 'Password tersalin' : ''}
          </span>
        </div>
      ) : (
        <span className="text-gray-500">
          Password lama tidak tersedia. Nonaktifkan lalu aktifkan kembali untuk membuat password
          baru.
        </span>
      )}
      {copyError && (
        <p role="alert" className="mt-1 text-red-600">
          {copyError}
        </p>
      )}
    </div>
  )
}

const CustomerList: React.FC = () => {
  const { isAdmin } = useAuth()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [loginError, setLoginError] = useState('')
  const pendingLogin = useRef(false)
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
    setSize,

    isLoading,
    isValidating,
    mutate,
  } = useSWRInfinite<ApiResponse<Customer>>(getKey, swrFetcher, {
    revalidateFirstPage: false,
  })

  const customers: Customer[] = pages
    ? pages.reduce<Customer[]>((acc, page) => acc.concat(page.data), [])
    : []

  const setLoginEnabled = async (customer: Customer, enabled: boolean) => {
    if (!isAdmin || pendingLogin.current || customer.id == null) return
    pendingLogin.current = true
    setBusyId(String(customer.id))
    setLoginError('')
    try {
      if (enabled) {
        await api.post(`/customers/${customer.id}/login`)
      } else {
        await api.delete(`/customers/${customer.id}/login`)
      }
      await mutate()
    } catch (error: any) {
      setLoginError(error.response?.data?.message ?? 'Gagal mengubah login pelanggan.')
    } finally {
      pendingLogin.current = false
      setBusyId(null)
    }
  }

  const handleReset = async (customer: Customer) => {
    if (!isAdmin || customer.id == null) return
    if (!confirm('Reset password pelanggan ini? Password baru akan dibuat.')) return
    setBusyId(String(customer.id))
    setLoginError('')
    try {
      const res = await api.post(`/customers/${customer.id}/login/reset`)
      const { username, password } = res.data.data
      await mutate(
        (current) =>
          current?.map((page) => ({
            ...page,
            data: page.data.map((row) =>
              String(row.id) === String(customer.id)
                ? {
                    ...row,
                    loginUsername: username ?? null,
                    loginPassword: password ?? null,
                    hasLogin: true,
                  }
                : row,
            ),
          })),
        { revalidate: false },
      )
    } catch (error: any) {
      setLoginError(error.response?.data?.message ?? 'Gagal mereset password pelanggan.')
    } finally {
      setBusyId(null)
    }
  }

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
      {loginError && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {loginError}
        </p>
      )}
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
                {isAdmin && <th className="p-4">Login pelanggan</th>}
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
                      <div className="text-xs text-gray-500 font-mono">{customer.CardCode}</div>
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
                    {isAdmin && (
                      <td className="p-4">
                        <label className="flex items-center gap-2 text-xs font-medium">
                          <input
                            type="checkbox"
                            checked={Boolean(customer.hasLogin)}
                            aria-label={`Aktifkan login ${customer.CardCode ?? customer.CardName}`}
                            disabled={
                              busyId !== null ||
                              customer.id == null ||
                              (!customer.hasLogin &&
                                (customer.NonActive === 'Y' || !customer.CardCode))
                            }
                            onChange={(event) => setLoginEnabled(customer, event.target.checked)}
                            className="h-4 w-4 rounded accent-blue-600 disabled:opacity-40"
                          />
                          {busyId === String(customer.id) ? 'Memproses...' : 'Login aktif'}
                        </label>
                        {customer.hasLogin && (
                          <button
                            type="button"
                            onClick={() => handleReset(customer)}
                            disabled={busyId !== null}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Reset password
                          </button>
                        )}
                        {customer.hasLogin && (
                          <div className="mt-2 text-xs">
                            <CustomerCredentials
                              key={`${customer.CardCode}:${customer.loginPassword ?? ''}`}
                              username={customer.loginUsername ?? customer.CardCode ?? ''}
                              password={customer.loginPassword ?? null}
                            />
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}

              {/* JIKA DATA MEMANG KOSONG */}
              {isEmpty && !isLoading && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="p-12 text-center text-sm text-gray-400">
                    Tidak ada data yang ditemukan.
                  </td>
                </tr>
              )}
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="p-0">
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

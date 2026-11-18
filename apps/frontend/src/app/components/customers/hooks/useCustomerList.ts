import { useEffect, useRef, useState } from 'react'
import useSWRInfinite from 'swr/infinite'
import { api, swrFetcher } from '@lib'
import { useAuth } from '@/app/contexts/authHook'
import { useIntersectionObserver } from '@hooks'
import type { Customer, ApiResponse } from '@repo/shared'
import { DEFAULT_LIMIT } from '@repo/shared'

const getErrorMessage = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null || !('response' in error)) return undefined
  const response = error.response
  if (typeof response !== 'object' || response === null || !('data' in response)) return undefined
  const data = response.data
  if (typeof data !== 'object' || data === null || !('message' in data)) return undefined
  return typeof data.message === 'string' ? data.message : undefined
}

export const useCustomerList = () => {
  const { isAdmin } = useAuth()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [loginError, setLoginError] = useState('')
  const pendingLogin = useRef(false)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const limit = DEFAULT_LIMIT
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)

    return () => clearTimeout(t)
  }, [search])

  const getKey = (pageIndex: number, previousPageData: ApiResponse<Customer> | null) => {
    if (previousPageData && previousPageData.data.length < limit) return null

    const params = new URLSearchParams({
      page: String(pageIndex + 1),
      limit: String(limit),
      search: debouncedSearch,
      showInactive: String(showInactive),
    })

    return `/customers?${params.toString()}`
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
    persistSize: false,
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
    } catch (error: unknown) {
      setLoginError(getErrorMessage(error) ?? 'Gagal mengubah login pelanggan.')
    } finally {
      pendingLogin.current = false
      setBusyId(null)
    }
  }

  const handleReset = async (customer: Customer) => {
    if (!isAdmin || pendingLogin.current || customer.id == null) return
    if (!confirm('Reset password pelanggan ini? Password baru akan dibuat.')) return
    pendingLogin.current = true
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
    } catch (error: unknown) {
      setLoginError(getErrorMessage(error) ?? 'Gagal mereset password pelanggan.')
    } finally {
      pendingLogin.current = false
      setBusyId(null)
    }
  }

  const isEmpty = pages?.[0]?.data?.length === 0
  const isReachingEnd = isEmpty || (pages && pages[pages.length - 1]?.data?.length < limit) || false
  const isFetching = isLoading || isValidating

  const observerTargetRef = useIntersectionObserver({
    enabled: Boolean(pages) && !isReachingEnd && !isFetching,
    onIntersect: () => {
      if (isFetching || isReachingEnd) return
      setSize((prev) => prev + 1)
    },
    rootMargin: '0px 0px 200px 0px',
    threshold: 0,
  })
  return {
    isAdmin, busyId, loginError, search, setSearch,
    showInactive, setShowInactive, handleClearSearch,
    customers, isLoading, isValidating, isFetching,
    isEmpty, isReachingEnd, observerTargetRef,
    setLoginEnabled, handleReset,
  }
}

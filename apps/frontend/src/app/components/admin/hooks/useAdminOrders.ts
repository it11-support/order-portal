
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWRInfinite from 'swr/infinite'
import { swrFetcher } from '@lib'
import type { OrderStatus, RequestKind } from '@repo/shared'
import { AdminOrder, OrdersResponse } from '../types'
import { PAGE_SIZE, STATUSES } from '../constants'



export const useAdminOrders = (kind: RequestKind = 'order') => {
  const navigate = useNavigate()

  const [statusFilter, setStatusFilter] =
    useState<OrderStatus | 'all'>('all')

  const getKey = (
    pageIndex: number,
    previousPageData: OrdersResponse | null,
  ) => {
    if (previousPageData && !previousPageData.pagination.hasNextPage) {
      return null
    }

    const params = new URLSearchParams({
      kind,
      page: String(pageIndex + 1),
      limit: String(PAGE_SIZE),
    })

    if (statusFilter !== 'all') {
      params.set('status', statusFilter)
    }

    return `/requests?${params.toString()}`
  }

  const {
    data: pages,
    setSize,
    isLoading,
    isValidating,
    error,
    mutate,
  } = useSWRInfinite<OrdersResponse>(getKey, swrFetcher, {
    revalidateFirstPage: false,
    persistSize: false,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  })

  const rows = useMemo(
    () => pages?.flatMap((page) => page.data) ?? [],
    [pages],
  )

  const stats = pages?.[0]?.stats ?? {}
  const pagination = pages?.[pages.length - 1]?.pagination

  const isEmpty = pages?.[0]?.data.length === 0

  const isReachingEnd =
    Boolean(isEmpty) ||
    (pages
      ? !pages[pages.length - 1].pagination.hasNextPage
      : false)

  const isFetching = isLoading || isValidating

  const loadMore = () => {
    if (isFetching || isReachingEnd || error) return
    void setSize((prev) => prev + 1)
  }

  const openOrder = (order: AdminOrder) => {
    if (order.status === 'draft' && kind === 'order') {
      navigate('/admin/sales-order', {
        state: { resumeDraft: order },
      })
      return
    }

    const list = kind === 'quote' ? 'inquiries' : 'orders'
    navigate(`/admin/${list}/${order.id}`)
  }

  return {
    rows,
    stats,
    pagination,
    statuses: STATUSES[kind],
    statusFilter,
    setStatusFilter,
    isLoading,
    isFetching,
    isEmpty,
    isReachingEnd,
    error,
    mutate,
    loadMore,
    openOrder,
  }
}


import { useMemo, useState } from 'react'
import { ClipboardList, MessageSquareQuote, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useSWRInfinite from 'swr/infinite'

import { Loader, StatusBadge, SapStatusBadge } from '@components'
import { STATUS_CONFIG } from '../StatusBadge'
import { swrFetcher, fmtDate } from '@lib'
import { Shell } from '@layouts'

import type {
  OrderStatus,
  RequestKind,
  SapLink,
} from '@repo/shared'

const PAGE_SIZE = 20

const COPY: Record<
  RequestKind,
  {
    title: string
    empty: string
    list: string
    eyebrow: string
  }
> = {
  order: {
    title: 'Admin — Pesanan',
    empty: 'Tidak ada pesanan',
    list: 'orders',
    eyebrow: 'Pesanan',
  },
  quote: {
    title: 'Admin — Permintaan Penawaran',
    empty: 'Tidak ada permintaan penawaran',
    list: 'inquiries',
    eyebrow: 'Permintaan Penawaran Harga',
  },
}

const STATUSES: Record<RequestKind, OrderStatus[]> = {
  order: [
    'draft',
    'pending',
    'confirmed',
    'processing',
    'delivered',
    'cancelled',
  ],
  quote: [
    'pending',
    'processing',
    'ready',
    'converted',
    'cancelled',
  ],
}

type Order = {
  id: string
  kind?: RequestKind
  status: OrderStatus
  company: string
  userName: string
  createdAt: string
  createdByName?: string | null
  source?: string
  sap?: SapLink | null
  items: {
    qty?: number | null
  }[]
}

type OrdersResponse = {
  data: Order[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  stats: Record<string, number>
}

const AdminOrdersPage = ({
  kind = 'order',
}: {
  kind?: RequestKind
}) => {
  const navigate = useNavigate()
  const copy = COPY[kind]

  const [statusFilter, setStatusFilter] =
    useState<OrderStatus | 'all'>('all')

  const statuses = STATUSES[kind]
  const EmptyIcon =
    kind === 'quote' ? MessageSquareQuote : ClipboardList

  // Key berubah saat kind atau status berubah.
  // persistSize: false mengembalikan pagination ke halaman 1.
  const getKey = (
    pageIndex: number,
    previousPageData: OrdersResponse | null,
  ) => {
    if (
      previousPageData &&
      !previousPageData.pagination.hasNextPage
    ) {
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
  } = useSWRInfinite<OrdersResponse>(
    getKey,
    swrFetcher,
    {
      revalidateFirstPage: false,
      persistSize: false,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    },
  )

  // Gabungkan seluruh halaman yang sudah dimuat.
  const rows = useMemo(
    () => pages?.flatMap((page) => page.data) ?? [],
    [pages],
  )

  // Statistik dihitung backend untuk seluruh data,
  // bukan hanya halaman yang sudah dimuat.
  const stats = pages?.[0]?.stats ?? {}

  const pagination =
    pages?.[pages.length - 1]?.pagination

  const isEmpty = pages?.[0]?.data.length === 0

  const isReachingEnd =
    Boolean(isEmpty) ||
    (pages
      ? !pages[pages.length - 1].pagination.hasNextPage
      : false)

  const isFetching = isLoading || isValidating

  const changeStatus = (status: OrderStatus | 'all') => {
    setStatusFilter(status)
  }

  const loadMore = () => {
    if (isFetching || isReachingEnd || error) return

    void setSize((prev) => prev + 1)
  }

  const openOrder = (order: Order) => {
    if (order.status === 'draft' && kind === 'order') {
      navigate('/admin/sales-order', {
        state: {
          resumeDraft: order,
        },
      })
      return
    }

    navigate(`/admin/${copy.list}/${order.id}`)
  }

  return (
    <Shell title={copy.title} showBack={false}>
      <div className="space-y-4">
        {/* Error */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600"
          >
            <p>Gagal memuat permintaan.</p>

            <button
              type="button"
              onClick={() => void mutate()}
              className="mt-2 font-semibold underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Loading awal */}
        {isLoading && rows.length === 0 && (
          <Loader label="Memuat permintaan..." />
        )}

        {/* Statistik */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {statuses
            .filter((status) => status !== 'draft')
            .map((status) => {
              const cfg = STATUS_CONFIG[status]
              const count = stats[status] ?? 0

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    changeStatus(
                      statusFilter === status
                        ? 'all'
                        : status,
                    )
                  }
                  className={`rounded-xl border bg-white p-3 text-left transition-all ${
                    statusFilter === status
                      ? 'border-accent shadow-sm shadow-accent/10'
                      : 'border-border hover:border-accent/40'
                  }`}
                >
                  <p className={`text-xs font-semibold ${cfg.text}`}>
                    {cfg.label}
                  </p>

                  <p className="mt-0.5 text-2xl font-bold text-foreground">
                    {count}
                  </p>
                </button>
              )
            })}
        </div>

        {/* Filter status */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
          {(['all', ...statuses] as (OrderStatus | 'all')[]).map(
            (status) => (
              <button
                key={status}
                type="button"
                onClick={() => changeStatus(status)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                  statusFilter === status
                    ? 'border-accent bg-accent text-white'
                    : 'border-border bg-white text-muted-foreground hover:border-accent/40'
                }`}
              >
                {status === 'all'
                  ? 'Semua'
                  : STATUS_CONFIG[status].label}
              </button>
            ),
          )}
        </div>

        {/* Daftar pesanan / inquiry */}
        {!isLoading && !error && isEmpty ? (
          <div className="py-12 text-center text-muted-foreground">
            <EmptyIcon
              size={40}
              className="mx-auto mb-3 opacity-20"
            />
            <p className="text-sm">{copy.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {rows.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => openOrder(order)}
                className="rounded-2xl border border-border bg-white p-4 text-left transition-all hover:border-accent/50 active:scale-[0.99]"
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs font-bold">
                      {order.id}
                    </p>

                    <p className="mt-0.5 text-sm font-bold">
                      {order.company}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {order.userName}
                    </p>
                  </div>

                  <StatusBadge
                    status={order.status}
                    kind={order.kind ?? kind}
                  />
                </div>

                {order.sap?.docEntry != null && (
                  <div className="mt-1.5">
                    <SapStatusBadge sap={order.sap} />
                  </div>
                )}

                <p className="mt-2 text-xs text-muted-foreground">
                  {fmtDate(order.createdAt)}
                </p>

                <p className="text-sm font-semibold">
                  {copy.eyebrow}
                </p>

                {order.source === 'sales' && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Dibuat sales
                    {order.createdByName
                      ? `: ${order.createdByName}`
                      : ''}
                  </p>
                )}

                {order.source === 'sap' && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Dari dokumen sistem
                    {order.sap?.docNum != null
                      ? ` ${order.sap.docNum}`
                      : ''}
                  </p>
                )}

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {order.items.length} produk{' '}
                  {kind === 'quote'
                    ? ''
                    : `${order.items.reduce(
                        (sum, item) =>
                          sum + (item.qty ?? 0),
                        0,
                      )} qty`}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Jumlah data */}
        {!isLoading && rows.length > 0 && pagination && (
          <p className="text-center text-xs text-muted-foreground">
            Menampilkan {rows.length} dari {pagination.total} permintaan
          </p>
        )}

        {/* Load More — gaya katalog */}
        {!isLoading &&
          rows.length > 0 &&
          !isReachingEnd && (
            <div className="flex items-center gap-4">
              <hr className="flex-1 border-border" />

              <button
                type="button"
                onClick={loadMore}
                disabled={isFetching || Boolean(error)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-2 text-sm font-semibold transition-colors hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isFetching ? 'Memuat...' : 'Lebih banyak'}
                <ChevronDown size={16} />
              </button>

              <hr className="flex-1 border-border" />
            </div>
          )}
      </div>
    </Shell>
  )
}

export default AdminOrdersPage

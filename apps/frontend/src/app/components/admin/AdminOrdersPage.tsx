import { ClipboardList, MessageSquareQuote, ChevronDown } from 'lucide-react'

import { Loader, StatusBadge, SapStatusBadge } from '@components'
import { STATUS_CONFIG } from '../StatusBadge'
import { fmtDate } from '@lib'
import { Shell } from '@layouts'

import type { OrderStatus, RequestKind } from '@repo/shared'
import { useAdminOrders } from './hooks'
import { COPY } from './constants'

const AdminOrdersPage = ({ kind = 'order' }: { kind?: RequestKind }) => {
  const copy = COPY[kind]
  const {
    rows,
    stats,
    pagination,
    statuses,
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
  } = useAdminOrders(kind)

  const changeStatus = setStatusFilter
  const EmptyIcon = kind === 'quote' ? MessageSquareQuote : ClipboardList

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
        {isLoading && rows.length === 0 && <Loader label="Memuat permintaan..." />}

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
                  onClick={() => changeStatus(statusFilter === status ? 'all' : status)}
                  className={`rounded-xl border bg-white p-3 text-left transition-all ${
                    statusFilter === status
                      ? 'border-accent shadow-sm shadow-accent/10'
                      : 'border-border hover:border-accent/40'
                  }`}
                >
                  <p className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</p>

                  <p className="mt-0.5 text-2xl font-bold text-foreground">{count}</p>
                </button>
              )
            })}
        </div>

        {/* Filter status */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
          {(['all', ...statuses] as (OrderStatus | 'all')[]).map((status) => (
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
              {status === 'all' ? 'Semua' : STATUS_CONFIG[status].label}
            </button>
          ))}
        </div>

        {/* Daftar pesanan / inquiry */}
        {!isLoading && !error && isEmpty ? (
          <div className="py-12 text-center text-muted-foreground">
            <EmptyIcon size={40} className="mx-auto mb-3 opacity-20" />
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
                    <p className="font-mono text-xs font-bold">{order.id}</p>

                    <p className="mt-0.5 text-sm font-bold">{order.company}</p>

                    <p className="text-xs text-muted-foreground">{order.userName}</p>
                  </div>

                  <StatusBadge status={order.status} kind={order.kind ?? kind} />
                </div>

                {order.sap?.docEntry != null && (
                  <div className="mt-1.5">
                    <SapStatusBadge sap={order.sap} />
                  </div>
                )}

                <p className="mt-2 text-xs text-muted-foreground">{fmtDate(order.createdAt)}</p>

                <p className="text-sm font-semibold">{copy.eyebrow}</p>

                {order.source === 'sales' && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Dibuat sales
                    {order.createdByName ? `: ${order.createdByName}` : ''}
                  </p>
                )}

                {order.source === 'sap' && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Dari dokumen sistem
                    {order.sap?.docNum != null ? ` ${order.sap.docNum}` : ''}
                  </p>
                )}

                <p className="mt-0.5 text-xs text-muted-foreground">
                  {order.items.length} produk{' '}
                  {kind === 'quote'
                    ? ''
                    : `${order.items.reduce((sum, item) => sum + (item.qty ?? 0), 0)} qty`}
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
        {!isLoading && rows.length > 0 && !isReachingEnd && (
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

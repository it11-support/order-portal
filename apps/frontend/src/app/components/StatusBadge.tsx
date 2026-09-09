import type { OrderStatus } from '@repo/shared'

export const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700' },
  confirmed: { label: 'Confirmed', bg: 'bg-blue-100', text: 'text-blue-700' },
  processing: { label: 'Processing', bg: 'bg-purple-100', text: 'text-purple-700' },
  delivered: { label: 'Delivered', bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-700' },
}

export const QUOTE_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Menunggu sales',
  processing: 'Ditindaklanjuti',
  confirmed: 'Harga ditawarkan',
  delivered: 'Selesai',
  cancelled: 'Dibatalkan',
}

export function StatusBadge({ status, kind }: { status: OrderStatus; kind?: string }) {
  const s = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${s.bg} ${s.text}`}
    >
      {kind === 'quote' ? QUOTE_STATUS_LABELS[status] : s.label}
    </span>
  )
}

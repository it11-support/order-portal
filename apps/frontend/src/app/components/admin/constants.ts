import { OrderStatus, RequestKind } from '@repo/shared'

export const COPY: Record<
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

export const PAGE_SIZE = 20

export const STATUSES: Record<RequestKind, OrderStatus[]> = {
  order: ['draft', 'pending', 'confirmed', 'processing', 'delivered', 'cancelled'],
  quote: ['pending', 'processing', 'ready', 'converted', 'cancelled'],
}

export const LIST_PATH: Record<RequestKind, string> = {
  order: '/admin/orders',
  quote: '/admin/inquiries',
}

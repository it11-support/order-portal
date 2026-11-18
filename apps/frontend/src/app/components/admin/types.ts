import { OrderStatus, RequestKind, SapLink } from '@repo/shared'

export type AdminOrder = {
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

export type OrdersResponse = {
  data: AdminOrder[]
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

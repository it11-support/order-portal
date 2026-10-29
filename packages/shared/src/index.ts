export interface Category {
  id: number
  code: string
  name: string
  icon?: string
  sortOrder: number
  isActive: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'delivered'
  | 'cancelled'
  /** Inquiry only: the customer accepted the quoted price and may order at it. */
  | 'ready'
  /** Inquiry only: the inquiry became an order. */
  | 'converted'

/**
 * The steps each list can take.
 *
 * Orders are admin's to run. An inquiry is a negotiation: it starts with the
 * customer's assigned sales person, and it is opened for ordering by the system
 * once every item carries a price of its own - so no staff button appears here
 * for that step. These lists mirror the server-side flow table so the buttons
 * offered always match what the API will accept.
 */
export const ORDER_FLOW: Record<OrderStatus, OrderStatus[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
  ready: [],
  converted: [],
}

export const QUOTE_FLOW: Record<OrderStatus, OrderStatus[]> = {
  draft: [],
  pending: ['processing', 'cancelled'],
  processing: ['cancelled'],
  ready: ['cancelled'],
  converted: [],
  cancelled: [],
  delivered: [],
  confirmed: [],
}

export type View =
  | 'login'
  | 'catalog'
  | 'category'
  | 'search'
  | 'cart'
  | 'orders'
  | 'order-detail'
  | 'customer-dashboard'
  | 'admin-orders'
  | 'admin-order-detail'
  | 'admin-customers'
  | 'admin-users'

export interface Product {
  id: number
  itemCode: string
  itemName: string
  foreignName?: string
  productGroupCode?: number
  productGroupName?: string
  productCategory: string
  isDistributor: boolean
  salesUnit?: string
  purchaseUnit?: string
  purchasePackSize?: number
  salesPackSize?: number
  salesPackUnit?: string
  launchDate?: Date | string
  isActive: boolean
  priceIncreased?: boolean
  priceDifference?: number | null
  priceIncreasePercent?: number | null
  currentPrice?: number | null
  /** Effective net price for the viewing customer. Null when no price is set. */
  price?: number | null
  currency?: string | null
  /** actual = this customer's last invoice price, pricelist = never bought it yet. */
  priceSource?: 'actual' | 'pricelist' | null
  createdAt: Date | string
  updatedAt: Date | string
}

/** One item whose price rose after the customer last saw it. */
export interface PriceChange {
  productId: string
  itemCode: string
  itemName: string
  oldPrice: number
  newPrice: number
  changePct: number
  currency: string | null
}

export interface CartItem {
  product: Product
  qty?: number
  /** Price the customer accepted when the item was added. */
  acceptedPrice?: number | null
  /** Unit price recorded on a submitted order line, snapshotted server-side. */
  price?: number | null
  currency?: string | null
  lineTotal?: number | null
  priceSource?: 'actual' | 'pricelist' | null
}

export interface FollowUpNote {
  id: string
  requestId: string
  author: {
    id: number | null
    name: string | null
    username: string
    role: 'customer' | 'admin' | 'sales_admin' | 'system'
  }
  /** user = written by a person, system = written by the portal. */
  source?: 'user' | 'system'
  /** internal notes are staff-only and never reach the customer. */
  visibility?: 'customer' | 'internal'
  message: string
  createdAt: Date | string
}

/**
 * How a request stands in the system.
 *
 * Once a portal order is a document, the document decides whether it is still
 * open, already closed or canceled. The portal mirrors that instead of guessing.
 */
export interface SapLink {
  companyId: string | null
  docEntry: number
  docNum: number | null
  docStatus: 'open' | 'closed' | 'unknown'
  status: 'open' | 'closed' | 'canceled' | 'unknown'
  canceled: boolean
  syncedAt: string | null
}

export interface Order {
  kind?: 'order' | 'quote'
  salesNotes?: string
  followUpNotes?: FollowUpNote[]
  cardCode?: string
  phone?: string
  salesName?: string
  id: string
  userId: string
  userName: string
  company: string
  items: CartItem[]
  status: OrderStatus
  /**
   * customer = raised by the customer, sales = raised by their sales person,
   * sap = imported from a SAP ORDR that already existed.
   */
  source?: 'customer' | 'sales' | 'sap'
  createdByName?: string | null
  /** actual | pricelist | mixed: the basis the line prices were resolved from. */
  priceBasis?: string | null
  inquiryId?: string | null
  convertedOrderId?: string | null
  sap?: SapLink | null
  createdAt: Date | string
  updatedAt: Date | string
  notes: string
}

export interface AppUser {
  id: string
  email: string
  name: string
  company: string
  cardCode?: string
  role: 'customer' | 'admin' | 'sales_admin'
  isActive: boolean
}

export * from './auth/index.js'
export * from './customer/index.js'
export * from './user/index.js'
export * from './pagination/index.js'
export * from './common/index.js'
export * from './constants/index.js'

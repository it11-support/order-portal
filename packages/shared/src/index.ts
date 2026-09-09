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

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'delivered' | 'cancelled'

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
  salesPackSize?: number
  salesPackUnit?: string
  launchDate?: Date | string
  isActive: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

export interface CartItem {
  product: Product
  qty?: number
}

export interface Order {
  kind?: 'order' | 'quote'
  salesNotes?: string
  cardCode?: string
  phone?: string
  salesName?: string
  id: string
  userId: string
  userName: string
  company: string
  items: CartItem[]
  status: OrderStatus
  createdAt: Date | string
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


export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "delivered"
  | "cancelled";

export type View =
  | "login"
  | "catalog"
  | "category"
  | "search"
  | "cart"
  | "orders"
  | "order-detail"
  | "admin-orders"
  | "admin-order-detail";


export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  minOrder: number;
  step: number;
  price?: number;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  company: string;
  items: CartItem[];
  status: OrderStatus;
  createdAt: Date | string;
  notes: string;
}


export interface AppUser {
  id: string;
  email: string;
  name: string;
  company: string;
  cardCode?: string;
  role: "customer" | "admin" | "sales_admin";
  isActive: boolean;
}

export * from './auth/index.js'
export * from './customer/index.js'
export * from './user/index.js'
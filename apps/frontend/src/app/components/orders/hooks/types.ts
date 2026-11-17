import type { Customer, Product } from '@repo/shared'

export type Step = 'customer' | 'product' | 'confirm'
export type SelectedCustomer = Pick<Customer, 'id' | 'CardName'> & Partial<Customer>
export type OrderLine = {
  product: Product
  qty: number
}
export type DraftCustomerFields = {
  customer?: Partial<Customer> | null
  customerId?: string | number | null
  CardCode?: string | null
  cardCode?: string | null
}

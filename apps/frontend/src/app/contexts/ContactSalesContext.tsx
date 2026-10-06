import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Product } from '@repo/shared'

/**
 * One place to ask the user to contact sales about a product.
 *
 * The button that opens this lives in QtyControl, and QtyControl is rendered by
 * ProductRow, which is rendered by ProductList. Rather than threading a callback
 * through three levels of presentational components, the modal is owned by the
 * nearest provider and any component calls `useContactSales().open(product)`.
 */
type ContactSalesState = {
  product: Product | null
  open: (product: Product) => void
  close: () => void
}

const ContactSalesContext = createContext<ContactSalesState | null>(null)

export const ContactSalesProvider = ({ children }: { children: ReactNode }) => {
  const [product, setProduct] = useState<Product | null>(null)

  return (
    <ContactSalesContext.Provider
      value={{
        product,
        open: setProduct,
        close: () => setProduct(null),
      }}
    >
      {children}
    </ContactSalesContext.Provider>
  )
}

export const useContactSales = () => {
  const ctx = useContext(ContactSalesContext)
  if (!ctx) throw new Error('useContactSales must be used within ContactSalesProvider')
  return ctx
}

export type { ContactSalesState }
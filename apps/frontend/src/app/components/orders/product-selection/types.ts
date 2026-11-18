import type { Customer, Product } from '@repo/shared'

export type SelectedCustomer = Pick<Customer, 'id' | 'CardName'> & Partial<Customer>

export type OrderLine = {
  product: Product
  qty: number
}
export type ProductSuggestion = {
  product: Product
  source: string
}

export type ProductMeta = {
  current_page: number
  total_pages: number
  total_records: number
  limit: number
}

import type {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
} from 'react'


export type ProductTab = 'actual' | 'pricelist'

export type ProductSelectionProps = {
  customer: {
    selectedCustomer: SelectedCustomer
    activeDraftId: string | null
    posting: boolean
    onBack: () => void
    onCancelDraft: (draftId: string) => void | Promise<void>
    onSaveDraft: () => void | Promise<void>
  }

  order: {
    lines: OrderLine[]
    totalQty: number
    total: number
    onRemoveLine: (productId: string) => void
    onSetLineQty: (productId: string, qty: number) => void
    onConfirm: () => void
    addLine: (product: Product, qty?: number) => void
  }

  search: {
    productSearch: string
    onProductSearch: (value: string) => void
    resetProductSearch: () => void
    productSearchRef: RefObject<HTMLInputElement>
    productSuggestionsOpen: boolean
    setProductSuggestionsOpen: Dispatch<SetStateAction<boolean>>
    activeSuggestionIndex: number
    setActiveSuggestionIndex: Dispatch<SetStateAction<number>>
    suggestionsLoading: boolean
    productSuggestions: ProductSuggestion[]
    suggestionRefs: MutableRefObject<(HTMLButtonElement | null)[]>
    openProductCart: (product: Product) => void
    searchingProducts: boolean
  }

  catalog: {
    productTab: ProductTab
    setProductTab: Dispatch<SetStateAction<ProductTab>>
    historyProducts: Product[]
    pricelistProducts: Product[]
    historyMeta?: ProductMeta
    pricelistMeta?: ProductMeta
    historyPage: number
    pricelistPage: number
    setHistoryPage: Dispatch<SetStateAction<number>>
    setPricelistPage: Dispatch<SetStateAction<number>>
    historyLoading: boolean
    pricelistLoading: boolean
    historyError: unknown
    pricelistError: unknown
  }

  cartDialog: {
    cartDialogProduct: Product | null
    setCartDialogProduct: Dispatch<SetStateAction<Product | null>>
    cartOpenRequest: number
  }
}
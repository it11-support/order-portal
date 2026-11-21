import { useCart, useCatalogProducts, useOrders } from '@/app/contexts'
import { RefObject } from 'react'

export type CatalogHeaderProps = {
  name?: string | null
  cardCode?: string | null
  search: string
  onSearch: () => void
  onClearSearch: () => void
}

export type Draft = ReturnType<typeof useOrders>['orders'][number]

export type SavedDraftsProps = {
  drafts: Draft[]
  expandedDraftId: string | null
  editingDraftId: string | null
  draftActionId: string | null
  savingDraft: boolean
  onExpand: (id: string | null) => void
  onContinue: (draft: Draft) => void
  onCancel: (id: string) => void
}

export type CatalogMode = 'history' | 'inquiry'

export type CatalogProduct = ReturnType<typeof useCatalogProducts>['products'][number]

export type Cart = ReturnType<typeof useCart>['cart']

export type InquiryItem = {
  productId: string
  name: string
}

export type CatalogProductsProps = {
  isCustomer: boolean
  isNonCustomer: boolean
  catalogMode: CatalogMode
  setCatalogMode: (mode: CatalogMode) => void
  products: CatalogProduct[]
  loading: boolean
  fetching: boolean
  reachingEnd: boolean
  total: number
  loadMore: () => void
  inquiryItems: InquiryItem[]
  onToggleInquiry: (product: CatalogProduct) => void
  cart: Cart
  catalogRef: RefObject<HTMLElement | null>
}

export type InquiryActionBarProps = {
  count: number
  sending: boolean
  onSubmit: () => void | Promise<void>
}

export type CartActionBarProps = {
  cart: Cart
  editingDraftId: string | null
  savingDraft: boolean
  onSave: () => void | Promise<void>
  onSubmit: () => void | Promise<void>
  onExitDraft: () => void
  onCancelDraft: (id: string) => void
}

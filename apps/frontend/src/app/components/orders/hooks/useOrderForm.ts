import { useEffect, useRef, useState } from 'react'
import type { Customer, Product } from '@repo/shared'
import { useDebounce } from '@/app/hooks'
import type { SelectedCustomer, Step } from './types'
export const useOrderForm = () => {
  const [step, setStep] = useState<Step>('customer')
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [productSuggestionsOpen, setProductSuggestionsOpen] = useState(false)
  const [cartDialogProduct, setCartDialogProduct] = useState<Product | null>(null)
  const [cartOpenRequest, setCartOpenRequest] = useState(0)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const productSearchRef = useRef<HTMLInputElement | null>(null)
  const [productTab, setProductTab] = useState<'actual' | 'pricelist'>('actual')
  const [historyPage, setHistoryPage] = useState(1)
  const [pricelistPage, setPricelistPage] = useState(1)
  const [notes, setNotes] = useState('')
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [activeDraftVersion, setActiveDraftVersion] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const customerId = selectedCustomer ? String(selectedCustomer.id) : ''
  const debouncedProductSearch = useDebounce(productSearch.trim(), 300)
  const searchingProducts = debouncedProductSearch.length > 0

  useEffect(() => {
    setActiveSuggestionIndex(-1)
  }, [debouncedProductSearch, historyPage, pricelistPage])

  useEffect(() => {
    if (activeSuggestionIndex >= 0) suggestionRefs.current[activeSuggestionIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeSuggestionIndex])

  const onProductSearch = (value: string) => {
    setProductSearch(value); setActiveSuggestionIndex(-1)
    setProductSuggestionsOpen(Boolean(value.trim()))
    setHistoryPage(1); setPricelistPage(1)
  }
  const openProductCart = (product: Product) => {
    setCartDialogProduct(product); setCartOpenRequest(current => current + 1)
    setProductSuggestionsOpen(false); setActiveSuggestionIndex(-1)
  }
  const resetProductSearch = () => {
    onProductSearch('')
    requestAnimationFrame(() => productSearchRef.current?.focus())
  }
  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer); setActiveDraftId(null); setActiveDraftVersion(null)
    setNotes(''); setProductSearch(''); setHistoryPage(1); setPricelistPage(1)
    setStep('product')
  }
  return {
    step,
    setStep,
    selectedCustomer,
    setSelectedCustomer,
    customerId,
    productSearch,
    setProductSearch,
    productSuggestionsOpen,
    setProductSuggestionsOpen,
    cartDialogProduct,
    setCartDialogProduct,
    cartOpenRequest,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    suggestionRefs,
    productSearchRef,
    productTab,
    setProductTab,
    historyPage,
    setHistoryPage,
    pricelistPage,
    setPricelistPage,
    notes,
    setNotes,
    activeDraftId,
    setActiveDraftId,
    activeDraftVersion,
    setActiveDraftVersion,
    posting,
    setPosting,
    debouncedProductSearch,
    searchingProducts,
    onProductSearch,
    openProductCart,
    resetProductSearch,
    selectCustomer
  }
}

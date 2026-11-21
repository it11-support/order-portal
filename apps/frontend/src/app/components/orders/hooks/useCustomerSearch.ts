import { useEffect, useRef, useState } from 'react'
import { useDebounce } from '@/app/hooks'
import { useCustomers } from './useCustomers'
import type { Step } from './types'

export const useCustomerSearch = (step: Step) => {
  const [search, setSearch] = useState('')
  const [activeCustomerIndex, setActiveCustomerIndex] = useState(-1)
  const [customerSuggestionsOpen, setCustomerSuggestionsOpen] =
    useState(false)

  const customerSearchRef = useRef<HTMLInputElement | null>(null)
  const customerOptionRefs = useRef<Array<HTMLButtonElement | null>>([])

  const debouncedSearch = useDebounce(search.trim(), 300)

  const {
    customers,
    customersLoading,
    customersValidating,
    customersError,
  } = useCustomers(step === 'customer', debouncedSearch)

  useEffect(() => {
    if (step === 'customer') {
      customerSearchRef.current?.focus()
    }
  }, [step])

  useEffect(() => {
    setActiveCustomerIndex(-1)
  }, [debouncedSearch])

  useEffect(() => {
    if (
      step === 'customer' &&
      activeCustomerIndex >= 0 &&
      customerSuggestionsOpen
    ) {
      customerOptionRefs.current[activeCustomerIndex]?.scrollIntoView({
        block: 'nearest',
      })
    }
  }, [activeCustomerIndex, step, customerSuggestionsOpen])

  return {
    search,
    setSearch,
    onCustomerSearch: setSearch,

    activeCustomerIndex,
    setActiveCustomerIndex,

    customerSuggestionsOpen,
    setCustomerSuggestionsOpen,

    customerSearchRef,
    customerOptionRefs,

    customers,
    customersLoading,
    customersValidating,
    customersError,

    customerResultsReady:
      !customersLoading &&
      !customersValidating &&
      debouncedSearch === search.trim(),

    customerSuggestions: customers.slice(0, 10),
  }
}
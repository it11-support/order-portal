import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { swrFetcher } from '@lib'
import type { Customer } from '@repo/shared'
import { useDebounce } from '@/app/hooks'
import type { Step } from './types'

type CustomerResponse = {
  data: Customer[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}
export const useCustomerSearch = (step: Step) => {
  const [search, setSearch] = useState('')
  const [activeCustomerIndex, setActiveCustomerIndex] = useState(-1)
  const [customerSuggestionsOpen, setCustomerSuggestionsOpen] = useState(false)
  const customerSearchRef = useRef<HTMLInputElement | null>(null)
  const customerOptionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const debouncedSearch = useDebounce(search.trim(), 300)

  useEffect(() => {
    if (step === 'customer') customerSearchRef.current?.focus()
  }, [step])

  useEffect(() => {
    setActiveCustomerIndex(-1)
  }, [debouncedSearch])

  useEffect(() => {
    if (step === 'customer' && activeCustomerIndex >= 0 && customerSuggestionsOpen)
      customerOptionRefs.current[activeCustomerIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeCustomerIndex, step, customerSuggestionsOpen])

  const {
    data,
    isLoading: customersLoading,
    isValidating: customersValidating,
  } = useSWR<CustomerResponse>(
    step === 'customer'
      ? `/customers?page=1&limit=100&search=${encodeURIComponent(debouncedSearch)}&showInactive=false`
      : null,
    swrFetcher,
    {
      keepPreviousData: false,
      revalidateOnFocus: false,
    },
  )

  const customers = data?.data ?? []
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
    customerResultsReady:
      !customersLoading && !customersValidating && debouncedSearch === search.trim(),
    customerSuggestions: customers.slice(0, 10),
  }
}

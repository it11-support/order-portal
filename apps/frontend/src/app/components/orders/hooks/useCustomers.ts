import useSWR from 'swr'
import { swrFetcher } from '@lib'
import { Customer } from '@repo/shared'

type CustomerResponse = {
  data: Customer[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const useCustomers = (
  enabled: boolean,
  debouncedSearch: string,
) => {
  const {
    data,
    isLoading,
    isValidating,
    error,
  } = useSWR<CustomerResponse>(
    enabled
      ? `/customers?page=1&limit=100&search=${encodeURIComponent(debouncedSearch)}&showInactive=false`
      : null,
    swrFetcher,
    {
      keepPreviousData: false,
      revalidateOnFocus: false,
    },
  )

  return {
    customers: data?.data ?? [],
    customerData: data,
    customersLoading: isLoading,
    customersValidating: isValidating,
    customersError: error,
  }
}
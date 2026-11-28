import { announcePriceChanges } from '@/services/price-alerts'
import type { PriceableCustomer } from './types'
import { refreshCustomerPrices } from './pricing'

export const observeCustomerPrices = async (
  customer: PriceableCustomer,
  itemCodes: string[],
): Promise<void> => {
  const movements = await refreshCustomerPrices(customer, itemCodes)

  if (movements.length) {
    await announcePriceChanges(customer.id, movements)
  }
}
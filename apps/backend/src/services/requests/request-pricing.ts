
import type { Product } from '@/generated/prisma/client'
import type { RequestItem } from './types'
import {
  priceableCustomer,
  refreshCustomerPrices,
} from '@/services/pricing/pricing'
import { pricesForItems } from '../pricing'

export const getRequestPrices = async (
  customerId: bigint,
  products: Product[],
  items: RequestItem[],
) => {
  const customer = await priceableCustomer(customerId)

  if (customer) {
    await refreshCustomerPrices(
      customer,
      [...new Set(products.map((product) => product.itemCode))],
    )
  }

  return pricesForItems(customerId, items)
}

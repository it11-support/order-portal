import type { Product } from '@/generated/prisma/client'
import type { RequestItem } from './types'

import { priceableCustomer } from '@/services/pricing/customer'
import { refreshCustomerPrices } from '@/services/pricing/pricing'
import { pricesForItems } from '@/services/pricing/order-check'

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

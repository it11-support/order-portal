import { prisma } from '@/utils'
import { announcePriceChanges } from '@/services/price-alerts'
import type { PriceableCustomer } from './types'
import { refreshCustomerPrices } from './pricing'


export const productNames = async (itemCodes: string[]) => {
  if (!itemCodes.length) return new Map<string, string>()
  const rows = await prisma.product.findMany({
    where: { itemCode: { in: itemCodes } },
    select: { itemCode: true, itemName: true },
  })
  return new Map(rows.map((row) => [row.itemCode, row.itemName]))
}

export const observeCustomerPrices = async (
  customer: PriceableCustomer,
  itemCodes: string[],
): Promise<void> => {
  const movements = await refreshCustomerPrices(customer, itemCodes)

  if (movements.length) {
    await announcePriceChanges(customer.id, movements)
  }
}

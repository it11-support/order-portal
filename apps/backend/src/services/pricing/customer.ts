import { prisma } from '@/utils'
import type { PriceableCustomer } from './types'

/**
 * Reads the customer master fields the price resolver depends on. Kept
 * separate from currentCustomer() so the catalog and the order gate share one
 * definition of "which price list does this customer buy at".
 *
 * The Prisma client extension stringifies BigInt on every read, so the id is
 * normalised back to BigInt here. Callers may pass a string or a BigInt.
 */
export const priceableCustomer = async (
  customerId: bigint | string,
): Promise<PriceableCustomer | null> => {
  const row = await prisma.customers.findUnique({
    where: { id: BigInt(String(customerId)) },
    select: { id: true, CardCode: true, priceListNum: true, discountLevel: true },
  })
  if (!row) return null
  return {
    id: BigInt(String(row.id)),
    CardCode: row.CardCode,
    priceListNum: row.priceListNum,
    discountLevel: row.discountLevel,
  }
}

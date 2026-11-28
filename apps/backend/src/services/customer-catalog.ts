import type { ProductWhereInput } from '@/generated/prisma/models'
import { cache, prisma } from '@/utils'
import type { AuthenticatedRequest } from '@auth'
import { CACHE_KEYS, CACHE_TTL } from './cache'


export const normalizeItemCode = (value: string): string =>
  value.trim().toUpperCase()

const emptyProductFilter = (): ProductWhereInput => ({
  isActive: true,
  itemCode: { in: [] },
})

const itemCodeFilter = (itemCodes: string[]): ProductWhereInput => ({
  isActive: true,
  itemCode: { in: itemCodes },
})


export const currentCustomer = async (req: AuthenticatedRequest) => {
  if (req.user?.role.name !== 'customer' || req.user.customerId == null) {
    return null
  }

  const id = String(req.user.customerId)

  if (!/^\d+$/.test(id)) {
    return null
  }

  const customer = await prisma.customers.findUnique({
    where: {
      id: BigInt(id),
    },
    select: {
      id: true,
      CardCode: true,
      CardName: true,
      IndustryC: true,
      NonActive: true,
    },
  })

  if (!customer?.CardCode || customer.NonActive === 'Y') {
    return null
  }

  return customer
}


export const fetchCustomerPurchasedItemCodes = async (
  cardCode: string,
): Promise<string[]> => {
  const rows = await prisma.$queryRaw<{ item_code: string }[]>`
    SELECT DISTINCT p.item_code
    FROM products p
    INNER JOIN sales_invoices si
      ON UPPER(TRIM(si.item_code)) = UPPER(TRIM(p.item_code))
    WHERE TRIM(si.card_code) = TRIM(${cardCode})
      AND si.canceled = 'N'
      AND si.quantity > 0
      AND p.item_code IS NOT NULL
  `

  return rows
    .map(({ item_code }) => item_code)
    .filter(
      (code): code is string =>
        typeof code === 'string' && code.trim().length > 0,
    )
}

export const customerPurchasedItemCodes = async (
  cardCode: string,
  fresh = false,
): Promise<string[]> => {
  if (fresh) {
    return fetchCustomerPurchasedItemCodes(cardCode)
  }

  return cache.remember(
    CACHE_KEYS.customer.purchased(cardCode),
    CACHE_TTL.CUSTOMER_PURCHASED,
    () => fetchCustomerPurchasedItemCodes(cardCode),
  )
}


const fetchCustomerItemCodes = async (
  cardCode: string,
  industryCode: number,
): Promise<string[]> => {
  const rows = await prisma.$queryRaw<{ item_code: string }[]>`
    SELECT p.item_code
    FROM products p
    WHERE EXISTS (
      SELECT 1
      FROM sales_invoices si
      INNER JOIN customers c
        ON TRIM(c.card_code) = TRIM(si.card_code)
      WHERE UPPER(TRIM(si.item_code)) = UPPER(TRIM(p.item_code))
        AND c.industry_c = ${industryCode}
        AND TRIM(c.card_code) <> TRIM(${cardCode})
        AND si.canceled = 'N'
        AND si.quantity > 0
    )
    AND NOT EXISTS (
      SELECT 1
      FROM sales_invoices own
      WHERE TRIM(own.card_code) = TRIM(${cardCode})
        AND UPPER(TRIM(own.item_code)) = UPPER(TRIM(p.item_code))
        AND own.canceled = 'N'
        AND own.quantity > 0
    )
  `

  return rows
    .map(({ item_code }) => item_code)
    .filter(
      (code): code is string =>
        typeof code === 'string' && code.trim().length > 0,
    )
}


export const customerItemCodes = async (
  cardCode: string,
  industryCode: number | null,
  fresh = false,
): Promise<string[]> => {
  if (industryCode == null) return []

  if (fresh) {
    return fetchCustomerItemCodes(cardCode, industryCode)
  }

  return cache.remember(
    CACHE_KEYS.customer.suggested(cardCode, industryCode),
    CACHE_TTL.CUSTOMER_SUGGESTED,
    () => fetchCustomerItemCodes(cardCode, industryCode),
  )
}


export const invalidateCustomerPurchasedItemCodes = async (
  cardCode: string,
): Promise<void> => {
  await cache.del(CACHE_KEYS.customer.purchased(cardCode))
}

export const invalidateCustomerSuggestedItemCodes = async (
  cardCode: string,
  industryCode: number | null,
): Promise<void> => {
  if (industryCode == null) return

  await cache.del(
    CACHE_KEYS.customer.suggested(cardCode, industryCode),
  )
}

export const customerPurchasedProductFilter = async (
  req: AuthenticatedRequest,
  fresh = false,
): Promise<ProductWhereInput> => {
  const customer = await currentCustomer(req)

  if (!customer?.CardCode) return emptyProductFilter()

  const itemCodes = await customerPurchasedItemCodes(
    customer.CardCode,
    fresh,
  )

  return itemCodeFilter(itemCodes)
}

export const customerSuggestedProductFilter = async (
  req: AuthenticatedRequest,
  fresh = false,
): Promise<ProductWhereInput> => {
  const customer = await currentCustomer(req)

  if (!customer?.CardCode) return emptyProductFilter()

  const itemCodes = await customerItemCodes(
    customer.CardCode,
    customer.IndustryC ?? null,
    fresh,
  )

  return itemCodeFilter(itemCodes)
}

export const customerUnpurchasedProductFilter = async (
  req: AuthenticatedRequest,
  fresh = false,
): Promise<ProductWhereInput> => {
  const customer = await currentCustomer(req)

  if (!customer?.CardCode) return emptyProductFilter()

  const purchasedCodes = await customerPurchasedItemCodes(
    customer.CardCode,
    fresh,
  )

  if (!purchasedCodes.length) return { isActive: true }

  return {
    isActive: true,
    itemCode: { notIn: purchasedCodes },
  }
}

export const customerProductFilter = async (
  req: AuthenticatedRequest,
  fresh = false,
): Promise<ProductWhereInput> => {
  return customerSuggestedProductFilter(req, fresh)
}
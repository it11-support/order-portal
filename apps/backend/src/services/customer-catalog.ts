import { ProductWhereInput } from '@/generated/prisma/models'
import { prisma } from '@/utils'
import type { AuthenticatedRequest } from '@auth'

export async function currentCustomer(req: AuthenticatedRequest) {
  if (req.user?.role.name !== 'customer' || req.user.customerId == null) return null
  const id = String(req.user.customerId)
  if (!/^\d+$/.test(id)) return null
  const customer = await prisma.customers.findUnique({
    where: { id: BigInt(id) },
    select: { id: true, CardCode: true, CardName: true, IndustryC: true, NonActive: true },
  })
  if (!customer?.CardCode || customer.NonActive === 'Y') return null
  return customer
}

// An all-time purchase is an actual non-cancelled invoice, not a portal request.
// A credit note does not erase the historical purchase event.
export async function customerItemCodes(
  cardCode: string,
  industryCode: number | null,
  suggested = false,
): Promise<string[]> {

  if (!suggested) {
    const rows = await prisma.$queryRaw<{ item_code: string }[]>`
      SELECT DISTINCT si.item_code
      FROM sales_invoices si
      WHERE si.card_code = ${cardCode}
        AND si.canceled = 'N'
        AND si.quantity > 0
        AND si.item_code IS NOT NULL
    `

    return rows
      .map((row) => row.item_code)
      .filter(Boolean)
  }

  if (industryCode == null) {    
    return []
  }

  // 1. Cek dulu apakah ada customer lain dengan industry sama
  const sameIndustryCustomers = await prisma.$queryRaw<
    { card_code: string; industry_c: number | null }[]
  >`
    SELECT card_code, industry_c
    FROM customers
    WHERE industry_c = ${industryCode}
      AND card_code <> ${cardCode}
    LIMIT 20
  `

  // 2. Ambil item yang dibeli customer lain di industry sama
  const industryItems = await prisma.$queryRaw<{ item_code: string }[]>`
    SELECT DISTINCT si.item_code
    FROM sales_invoices si
    INNER JOIN customers c
      ON c.card_code = si.card_code
    WHERE c.industry_c = ${industryCode}
      AND c.card_code <> ${cardCode}
      AND si.canceled = 'N'
      AND si.quantity > 0
      AND si.item_code IS NOT NULL
  `

  // 3. Exclude produk yang customer sendiri sudah pernah beli
  const rows = await prisma.$queryRaw<{ item_code: string }[]>`
    SELECT DISTINCT si.item_code
    FROM sales_invoices si
    INNER JOIN customers c
      ON c.card_code = si.card_code

    WHERE c.industry_c = ${industryCode}
      AND c.card_code <> ${cardCode}
      AND si.canceled = 'N'
      AND si.quantity > 0
      AND si.item_code IS NOT NULL

      AND NOT EXISTS (
        SELECT 1
        FROM sales_invoices own
        WHERE own.card_code = ${cardCode}
          AND own.item_code = si.item_code
          AND own.canceled = 'N'
          AND own.quantity > 0
      )
  `
  return rows
    .map((row) => row.item_code)
    .filter(Boolean)
}

export async function customerProductFilter(
  req: AuthenticatedRequest,
  suggested = false,
): Promise<ProductWhereInput> {
  const customer = await currentCustomer(req)

  if (!customer?.CardCode) {
    return {
      isActive: true,
      itemCode: { in: [] },
    }
  }

  const itemCodes = await customerItemCodes(
    customer.CardCode,
    customer.IndustryC ?? null,
    suggested,
  )

  return {
    isActive: true,
    itemCode: {
      in: itemCodes,
    },
  }
}
import { prisma } from '@/utils'
import type { AuthenticatedRequest } from '@auth'

export async function currentCustomer(req: AuthenticatedRequest) {
  if (req.user?.role.name !== 'customer') return null
  const id = String(req.user.customerId ?? req.user.id)
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
  subgroup: number | null,
  suggested = false,
) {
  if (!suggested) {
    const rows = await prisma.$queryRaw<{ item_code: string }[]>`
      SELECT DISTINCT item_code FROM sales_invoices
      WHERE card_code = ${cardCode} AND canceled = 'N' AND quantity > 0 AND item_code IS NOT NULL`
    return rows.map((row) => row.item_code).filter(Boolean)
  }
  if (subgroup === null) return []
  const rows = await prisma.$queryRaw<{ item_code: string }[]>`
    SELECT DISTINCT s.item_code FROM sales_invoices s
    JOIN customers c ON c.card_code = s.card_code
    WHERE c.industry_c = ${subgroup} AND c.card_code <> ${cardCode}
      AND s.canceled = 'N' AND s.quantity > 0 AND s.item_code IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM sales_invoices own
        WHERE own.card_code = ${cardCode} AND own.item_code = s.item_code
          AND own.canceled = 'N' AND own.quantity > 0
      )`
  return rows.map((row) => row.item_code).filter(Boolean)
}

export async function customerProductFilter(req: AuthenticatedRequest, suggested = false) {
  const customer = await currentCustomer(req)
  const itemCodes = customer
    ? await customerItemCodes(customer.CardCode!, customer.IndustryC, suggested)
    : []
  return { isActive: true, itemCode: { in: itemCodes } }
}

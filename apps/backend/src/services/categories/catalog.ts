import type { AuthenticatedRequest } from '@auth'
import type { ProductWhereInput } from '@/generated/prisma/models'
import { prisma } from '@utils'
import {
  currentCustomer,
  customerItemCodes,
  customerPurchasedItemCodes,
  normalizeItemCode,
} from '@/services/customer-catalog'

export type CatalogProduct = Awaited<ReturnType<typeof prisma.product.findMany>>[number]

export class CatalogAccessError extends Error { }

export type CatalogOptions = {
  category: string
  search: string
  customerId?: string
}

const searchWhere = (search: string): ProductWhereInput =>
  search
    ? {
      OR: [
        { itemName: { contains: search, mode: 'insensitive' } },
        { itemCode: { contains: search, mode: 'insensitive' } },
      ],
    }
    : {}

const byName = { itemName: 'asc' as const }

const productWhere = (
  options: Pick<CatalogOptions, 'category' | 'search'>,
): ProductWhereInput => ({
  isActive: true,
  ...(options.category
    ? { productCategory: options.category }
    : {}),
  ...searchWhere(options.search),
})

const findProducts = (where: ProductWhereInput) =>
  prisma.product.findMany({
    where,
    orderBy: byName,
  })


// Purchased products come first; normalize item codes before deduplication.
const mergeDistinct = (first: CatalogProduct[], second: CatalogProduct[]): CatalogProduct[] => {
  const seen = new Set<string>()
  const result: CatalogProduct[] = []
  for (const product of [...first, ...second]) {
    const key = normalizeItemCode(product.itemCode)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(product)
  }
  return result
}

const purchasedFirst = async (
  codes: string[],
  where: ProductWhereInput,
): Promise<CatalogProduct[]> => {
  const purchased = codes.length
    ? await findProducts({
      ...where,
      itemCode: { in: codes },
    })
    : []

  const claimedCodes = purchased.map((product) => product.itemCode)

  const others = await findProducts({
    ...where,
    ...(claimedCodes.length
      ? { itemCode: { notIn: claimedCodes } }
      : {}),
  })
  return mergeDistinct(purchased, others)
}

export const resolveTargetCustomer = async (req: AuthenticatedRequest, customerId: string) => {
  const target = await prisma.customers.findUnique({
    where: { id: BigInt(customerId) },
    select: { id: true, CardCode: true, IndustryC: true, SlpCode: true, NonActive: true },
  })
  const allowed = Boolean(
    target?.CardCode &&
    target.NonActive !== 'Y' &&
    (req.user?.role.name === 'admin' ||
      (req.user?.slpCode != null && String(target.SlpCode) === String(req.user.slpCode))),
  )
  if (!allowed || !target?.CardCode) {
    throw new CatalogAccessError('Customer not found or access denied.')
  }

  return {
    ...target,
    CardCode: target.CardCode,
  }
}


export const loadCatalog = async (
  req: AuthenticatedRequest,
  options: CatalogOptions,
): Promise<{
  products: CatalogProduct[]
  priceCustomerId: bigint | null
}> => {
  const { category, customerId } = options
  const where = productWhere(options)

  if (req.user?.role.name === 'customer') {
    const priceCustomerId =
      req.user.customerId == null
        ? null
        : BigInt(String(req.user.customerId))

    if (category) {
      return {
        products: await findProducts(where),
        priceCustomerId,
      }
    }

    const customer = await currentCustomer(req)

    if (!customer?.CardCode) {
      return { products: [], priceCustomerId }
    }

    const codes = await customerItemCodes(
      customer.CardCode,
      customer.IndustryC ?? null,
    )

    return {
      products: await purchasedFirst(codes, where),
      priceCustomerId,
    }
  }

  if (customerId) {
    const target = await resolveTargetCustomer(req, customerId)

    const codes = [
      ...new Set(
        await customerPurchasedItemCodes(target.CardCode),
      ),
    ]

    return {
      products: await purchasedFirst(codes, where),
      priceCustomerId: target.id,
    }
  }

  return {
    products: await findProducts(where),
    priceCustomerId: null,
  }
}


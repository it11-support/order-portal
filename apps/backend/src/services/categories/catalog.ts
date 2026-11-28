import type { AuthenticatedRequest } from '@auth'
import type { ProductWhereInput } from '@/generated/prisma/models'
import { cache, prisma } from '@utils'
import {
  currentCustomer,
  customerItemCodes,
  customerPurchasedItemCodes,
  normalizeItemCode,
} from '@/services/customer-catalog'
import { CACHE_KEYS, CACHE_TTL } from '../cache'

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

const findProducts = (
  where: ProductWhereInput,
): Promise<CatalogProduct[]> => {
  const fetchProducts = () =>
    prisma.product.findMany({
      where,
      orderBy: byName,
    })

  // Cache hanya untuk filter master produk yang dikenal.
  const cacheable =
    where.isActive === true &&
    Object.keys(where).every(
      (key) =>
        key === 'isActive' ||
        key === 'productCategory',
    ) &&
    (
      where.productCategory === undefined ||
      typeof where.productCategory === 'string'
    )

  if (!cacheable) {
    return fetchProducts()
  }

  const category =
    typeof where.productCategory === 'string'
      ? where.productCategory
      : undefined

  const key =
    category === undefined
      ? CACHE_KEYS.product.catalog
      : CACHE_KEYS.product.catalogByCategory(category)

  return cache.remember(
    key,
    CACHE_TTL.PRODUCT_CATALOG,
    fetchProducts,
  )
}


// Purchased products come first; normalize item codes before deduplication.
const mergeDistinct = (
  first: CatalogProduct[],
  second: CatalogProduct[],
): CatalogProduct[] => {
  const seen = new Set<string>()
  const result: CatalogProduct[] = []

  for (const products of [first, second]) {
    for (const product of products) {
      const key = normalizeItemCode(product.itemCode)

      if (seen.has(key)) continue

      seen.add(key)
      result.push(product)
    }
  }

  return result
}

const purchasedFirst = (
  codes: string[],
  products: CatalogProduct[],
): CatalogProduct[] => {
  if (!codes.length || !products.length) {
    return mergeDistinct([], products)
  }

  const codeSet = new Set(codes)

  const purchased: CatalogProduct[] = []
  const others: CatalogProduct[] = []

  for (const product of products) {
    if (codeSet.has(product.itemCode)) {
      purchased.push(product)
    } else {
      others.push(product)
    }
  }

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
    const customer = await currentCustomer(req)

    if (!customer?.CardCode) {
      return {
        products: [],
        priceCustomerId: null,
      }
    }

    if (category) {
      return {
        products: await findProducts(where),
        priceCustomerId: customer.id,
      }
    }

    const [codes, products] = await Promise.all([
      customerItemCodes(
        customer.CardCode,
        customer.IndustryC ?? null,
      ),
      findProducts(where),
    ])

    return {
      products: purchasedFirst(codes, products),
      priceCustomerId: customer.id,
    }
  }

  if (customerId) {
    const target = await resolveTargetCustomer(req, customerId)

    const [codes, products] = await Promise.all([
      customerPurchasedItemCodes(target.CardCode),
      findProducts(where),
    ])

    return {
      products: purchasedFirst(codes, products),
      priceCustomerId: target.id,
    }
  }

  return {
    products: await findProducts(where),
    priceCustomerId: null,
  }
}

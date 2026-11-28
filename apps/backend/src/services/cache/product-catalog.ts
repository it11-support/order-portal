import { cache, prisma } from '@/utils'
import { CACHE_KEYS, CACHE_TTL } from './keys'

export const getCachedCategories = async (
  isCustomer = false,
) => {
  const key = isCustomer
    ? CACHE_KEYS.product.customerCategories
    : CACHE_KEYS.product.categories

  return cache.remember(
    key,
    CACHE_TTL.PRODUCT_CATEGORY,
    async () => {
      if (!isCustomer) {
        return prisma.category.findMany({
          orderBy: { sortOrder: 'asc' },
        })
      }

      const products = await prisma.product.findMany({
        where: { isActive: true },
        select: { productCategory: true },
        distinct: ['productCategory'],
      })

      const availableCodes = products.map(
        (product) => product.productCategory,
      )

      return prisma.category.findMany({
        where: {
          isActive: true,
          code: { in: availableCodes },
        },
        orderBy: { sortOrder: 'asc' },
      })
    },
  )
}

export const invalidateProductCategories = async (): Promise<void> => {
  await cache.del(
    CACHE_KEYS.product.categories,
    CACHE_KEYS.product.customerCategories,
  )
}
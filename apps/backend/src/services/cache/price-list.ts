import { cache, prisma } from '@/utils'
import { CACHE_KEYS, CACHE_TTL } from './keys'

export type RawPriceListItem = {
  price: string
  currency: string | null
}

export const getCachedPriceList = async (
  listNum: number,
): Promise<Map<string, RawPriceListItem>> => {
  return cache.remember(
    CACHE_KEYS.pricing.priceList(listNum),
    CACHE_TTL.PRICE_LIST,
    async () => {
      const rows = await prisma.$queryRaw<
        {
          item_code: string
          price: string
          currency: string | null
        }[]
      >`
        SELECT DISTINCT ON (ip.item_code)
          ip.item_code,
          ip.price::text AS price,
          ip.currency
        FROM item_prices ip
        WHERE ip.list_num = ${listNum}
          AND ip.price IS NOT NULL
        ORDER BY
          ip.item_code,
          ip.updated_at DESC
      `

      return new Map(
        rows.map((row) => [
          row.item_code,
          {
            price: row.price,
            currency: row.currency,
          },
        ]),
      )
    },
  )
}

export const invalidatePriceList = async (
  listNum: number,
): Promise<void> => {
  await cache.del(CACHE_KEYS.pricing.priceList(listNum))
}
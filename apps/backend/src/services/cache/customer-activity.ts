import { prisma, cache } from '@/utils'
import { CACHE_KEYS, CACHE_TTL } from './keys'

type CustomerActivity = {
  count: number
  lastDate: number
}

export const getCustomerActivity = async (): Promise<
  Map<string, CustomerActivity>
> => {
  return cache.remember(
    CACHE_KEYS.customer.activity,
    CACHE_TTL.CUSTOMER_ACTIVITY,
    async () => {
      const since = new Date()
      since.setMonth(since.getMonth() - 3)

      const invoices = await prisma.salesInvoice.groupBy({
        by: ['cardCode'],
        where: {
          docDate: {
            gte: since,
          },
        },
        _count: {
          _all: true,
        },
        _max: {
          docDate: true,
        },
      })

      const activityMap = new Map<string, CustomerActivity>()

      for (const invoice of invoices) {
        if (invoice.cardCode == null) continue

        activityMap.set(invoice.cardCode, {
          count: invoice._count._all,
          lastDate: invoice._max.docDate?.getTime() ?? 0,
        })
      }

      return activityMap
    },
  )
}

export const invalidateCustomerActivity = async (): Promise<void> => {
  await cache.del(CACHE_KEYS.customer.activity)
}
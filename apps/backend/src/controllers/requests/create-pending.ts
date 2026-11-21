import { prisma } from '@/utils'
import type { Prisma, Product } from '@/generated/prisma/client'
import type { CreateRequestInput } from './validation'
import {
  priceableCustomer,
  pricesForItems,
  refreshCustomerPrices,
  round6,
} from '@/services/pricing'
import { generateRequestNumber } from '@/services/order-number'
import { actorOf, customerSelect } from '@/services/requests/access'
import { settleInquiryOrderability } from '@/services/price-alerts'

type PendingContext = {
  actor: NonNullable<ReturnType<typeof actorOf>>
  customerId: bigint
  input: CreateRequestInput
  products: Product[]
  parentInquiry: {
    id: string
    customerId: bigint
    status: string
  } | null
  createdById: number
}

export const createPendingRequest = async ({
  actor,
  customerId,
  input,
  products,
  parentInquiry,
  createdById,
}: PendingContext) => {
  const { kind, items, notes } = input

  if (input.status !== 'pending') {
    throw new Error('Status request harus pending.')
  }

  const customerForPrices = await priceableCustomer(customerId)

  if (customerForPrices) {
    await refreshCustomerPrices(customerForPrices, [
      ...new Set(products.map((product) => product.itemCode)),
    ])
  }

  const linePrices = await pricesForItems(customerId, items)

  const productMap = new Map(products.map((product) => [String(product.id), product]))

  const sources = new Set<string>()

  const snapshot = items.map((item) => {
    const product = productMap.get(item.productId)

    if (!product) {
      throw new Error(`Produk ${item.productId} tidak ditemukan`)
    }

    const price = linePrices.get(product.itemCode)
    const qty = item.qty ?? 1

    if (price) sources.add(price.source)

    return {
      product,
      qty,
      ...(price
        ? {
            price: price.price,
            currency: price.currency,
            priceSource: price.source,
            lineTotal: kind === 'order' ? round6(qty * price.price) : null,
          }
        : {}),
    }
  })

  const priceBasis = sources.size === 1 ? [...sources][0] : sources.size > 1 ? 'mixed' : null

  const id = await generateRequestNumber(kind)

  const include = {
    customer: { select: customerSelect },
    createdBy: { select: { name: true } },
  } satisfies Prisma.PortalRequestInclude

  // Save request and convert parent inquiry atomically.
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.portalRequest.create({
      data: {
        id,
        customerId,
        kind,
        notes,
        items: JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue,
        status: 'pending',
        source: actor.role === 'customer' ? 'customer' : 'sales',
        createdById,
        priceBasis,
        inquiryId: parentInquiry?.id ?? null,
      },
      include,
    })

    if (parentInquiry) {
      const updated = await tx.portalRequest.updateMany({
        where: {
          id: parentInquiry.id,
          customerId,
          kind: 'quote',
          status: {
            notIn: ['cancelled', 'converted'],
          },
        },
        data: {
          status: 'converted',
          convertedOrderId: created.id,
        },
      })

      if (updated.count !== 1) {
        throw new Error('Inquiry sudah selesai atau berubah.')
      }

      await tx.followUpNote.create({
        data: {
          requestId: parentInquiry.id,
          authorId: null,
          authorName: 'Portal',
          authorRole: 'system',
          source: 'system',
          visibility: 'customer',
          message: `Inquiry ini dikonversi menjadi pesanan ${created.id}.`,
        },
      })
    }

    return created
  })

  // Only pending inquiries need automatic orderability settlement.
  if (kind === 'quote' && (await settleInquiryOrderability(row.id))) {
    return prisma.portalRequest.findUniqueOrThrow({
      where: { id: row.id },
      include,
    })
  }

  return row
}

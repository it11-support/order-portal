import { prisma } from '@/utils'
import type { CreateRequestInput } from './validation'
import type { Prisma, Product } from '@/generated/prisma/client'
import {
  priceableCustomer,
  pricesForItems,
  refreshCustomerPrices,
  round6,
} from '@/services/pricing'
import { generateRequestNumber } from '@/services/order-number'
import { actorOf, customerSelect } from '@/services/requests/access'

type DraftContext = {
  actor: NonNullable<ReturnType<typeof actorOf>>
  customerId: bigint
  input: CreateRequestInput
  products: Product[]
  parentInquiry: {
    id: string
  } | null
  createdById: number
}

export const createDraftRequest = async ({
  actor,
  customerId,
  input,
  products,
  parentInquiry,
  createdById,
}: DraftContext) => {
  if (input.kind !== 'order' || input.status !== 'draft') {
    throw new Error('Draft hanya tersedia untuk order.')
  }

  const customerForPrices = await priceableCustomer(customerId)

  if (customerForPrices) {
    await refreshCustomerPrices(customerForPrices, [
      ...new Set(products.map((product) => product.itemCode)),
    ])
  }

  const linePrices = await pricesForItems(customerId, input.items)

  const productMap = new Map(products.map((product) => [String(product.id), product]))

  const snapshot = input.items.map((item) => {
    const product = productMap.get(item.productId)

    if (!product) {
      throw new Error(`Produk ${item.productId} tidak ditemukan`)
    }

    const price = linePrices.get(product.itemCode)
    const qty = item.qty!

    return {
      product,
      qty,
      ...(price
        ? {
            price: price.price,
            currency: price.currency,
            priceSource: price.source,
            lineTotal: round6(qty * price.price),
          }
        : {}),
    }
  })

  const id = await generateRequestNumber('order')

  return prisma.portalRequest.create({
    data: {
      id,
      customerId,
      kind: 'order',
      notes: input.notes,
      items: JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue,
      status: 'draft',
      source: actor.role === 'customer' ? 'customer' : 'sales',
      createdById,
      inquiryId: parentInquiry?.id ?? null,
    },
    include: {
      customer: { select: customerSelect },
      createdBy: { select: { name: true } },
    },
  })
}

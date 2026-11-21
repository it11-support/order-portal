
import { prisma } from '@/utils'
import type { CreateRequestInput } from './validation'
import type { Prisma, Product } from '@/generated/prisma/client'
import { generateRequestNumber } from '@/services/order-number'
import { actorOf, customerSelect } from '@/services/requests/access'
import { buildRequestSnapshot } from '@/services/requests/request-snapshot'
import { getRequestPrices } from '@/services/requests/request-pricing'

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

  const prices = await getRequestPrices(
    customerId,
    products,
    input.items,
  )

  const { snapshot } = buildRequestSnapshot({
    products,
    items: input.items,
    prices,
    kind: 'order',
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

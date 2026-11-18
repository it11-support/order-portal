import type { ProductWhereInput } from '@/generated/prisma/models'
import { prisma } from '@/utils'

import { AuthenticatedRequest } from '@/auth'
import { CreateRequestInput } from './validation'
import {
  customerPurchasedProductFilter,
  customerUnpurchasedProductFilter,
} from '@/services/customer-catalog'
import { priceIncreaseCheck } from '@/services/pricing'
import { actorOf } from '@/services/requests/access'

type Actor = NonNullable<ReturnType<typeof actorOf>>

const resolveParentInquiry = async (inquiryId: string | undefined, customerId: bigint) => {
  if (!inquiryId) {
    return { ok: true, data: null } as const
  }

  const inquiry = await prisma.portalRequest.findUnique({
    where: { id: inquiryId },
  })

  if (!inquiry || inquiry.kind !== 'quote') {
    return {
      ok: false,
      status: 404,
      error: { message: 'Inquiry tidak ditemukan.' },
    } as const
  }

  if (inquiry.customerId !== customerId) {
    return {
      ok: false,
      status: 403,
      error: { message: 'Inquiry bukan milik pelanggan ini.' },
    } as const
  }

  if (['cancelled', 'converted'].includes(inquiry.status)) {
    return {
      ok: false,
      status: 409,
      error: { message: 'Inquiry sudah selesai.' },
    } as const
  }

  return { ok: true, data: inquiry } as const
}

const inquiryItemCodes = (items: unknown): string[] => {
  if (!Array.isArray(items)) return []

  return [
    ...new Set(
      items.flatMap((item: unknown): string[] => {
        if (!item || typeof item !== 'object' || !('product' in item)) {
          return []
        }

        const product = item.product

        if (
          !product ||
          typeof product !== 'object' ||
          !('itemCode' in product) ||
          typeof product.itemCode !== 'string'
        ) {
          return []
        }

        return [product.itemCode]
      }),
    ),
  ]
}

type ParentInquiry = NonNullable<
  Awaited<ReturnType<typeof resolveParentInquiry>> extends never
    ? never
    : Awaited<ReturnType<typeof prisma.portalRequest.findUnique>>
>

const resolveProductFilter = async (
  req: AuthenticatedRequest,
  actor: Actor,
  kind: CreateRequestInput['kind'],
  parentInquiry: ParentInquiry | null,
): Promise<ProductWhereInput> => {
  if (parentInquiry) {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        itemCode: {
          in: inquiryItemCodes(parentInquiry.items),
        },
      },
      select: { id: true },
    })

    return {
      id: { in: products.map((product) => product.id) },
    }
  }

  if (actor.role !== 'customer') {
    return { isActive: true }
  }

  return kind === 'order'
    ? customerPurchasedProductFilter(req)
    : customerUnpurchasedProductFilter(req)
}

const validateRequestPrices = async (
  actor: Actor,
  customerId: bigint,
  input: CreateRequestInput,
) => {
  if (input.status === 'draft' || input.kind !== 'order' || actor.role !== 'customer') {
    return { ok: true } as const
  }

  const priceChanges = await priceIncreaseCheck(customerId, input.items)

  if (!priceChanges.length || input.priceAccepted) {
    return { ok: true } as const
  }

  return {
    ok: false,
    status: 409,
    error: {
      message:
        'Harga beberapa produk sudah naik sejak terakhir Anda lihat. Konfirmasi harga terbaru untuk melanjutkan pesanan.',
      code: 'PRICE_INCREASED',
      priceChanges,
    },
  } as const
}

const productValidationMessage = (
  actor: Actor,
  kind: CreateRequestInput['kind'],
  hasInquiry: boolean,
): string => {
  if (hasInquiry) {
    return 'Pesanan hanya untuk produk yang ada pada inquiry tersebut.'
  }

  if (actor.role !== 'customer') {
    return 'Produk tidak valid atau tidak aktif.'
  }

  return kind === 'order'
    ? 'Pesanan hanya untuk produk aktif yang pernah Anda beli.'
    : 'Penawaran hanya untuk produk saran aktif yang belum pernah Anda beli.'
}

export const prepareRequestContext = async (
  req: AuthenticatedRequest,
  actor: Actor,
  customerId: bigint,
  input: CreateRequestInput,
) => {
  const inquiry = await resolveParentInquiry(input.inquiryId, customerId)

  if (!inquiry.ok) return inquiry

  const parentInquiry = inquiry.data

  const productWhere = await resolveProductFilter(req, actor, input.kind, parentInquiry)

  const products = await prisma.product.findMany({
    where: {
      AND: [
        { isActive: true },
        productWhere,
        {
          id: {
            in: input.items.map((item) => BigInt(item.productId)),
          },
        },
      ],
    },
  })

  if (products.length !== input.items.length) {
    return {
      ok: false,
      status: 400,
      error: {
        message: productValidationMessage(actor, input.kind, Boolean(parentInquiry)),
      },
    } as const
  }

  const pricing = await validateRequestPrices(actor, customerId, input)

  if (!pricing.ok) return pricing

  return {
    ok: true,
    data: {
      actor,
      customerId,
      input,
      products,
      parentInquiry,
    },
  } as const
}

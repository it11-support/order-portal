
import type { ProductWhereInput } from '@/generated/prisma/models'
import { prisma } from '@/utils'

import { AuthenticatedRequest } from '@/auth'
import { CreateRequestInput } from './validation'
import { customerPurchasedProductFilter, customerUnpurchasedProductFilter } from '@/services/customer-catalog'
import { priceIncreaseCheck } from '@/services/pricing'
import { actorOf } from '@/services/requests/access'

type Actor = NonNullable<ReturnType<typeof actorOf>>

export const prepareRequestContext = async (
  req: AuthenticatedRequest,
  actor: Actor,
  customerId: bigint,
  input: CreateRequestInput,
) => {
  const { kind, items, inquiryId, priceAccepted } = input

  let parentInquiry = null

  if (inquiryId) {
    parentInquiry = await prisma.portalRequest.findUnique({
      where: { id: inquiryId },
    })

    if (!parentInquiry || parentInquiry.kind !== 'quote') {
      return {
        ok: false,
        status: 404,
        error: { message: 'Inquiry tidak ditemukan.' },
      } as const
    }

    if (String(parentInquiry.customerId) !== String(customerId)) {
      return {
        ok: false,
        status: 403,
        error: { message: 'Inquiry bukan milik pelanggan ini.' },
      } as const
    }

    if (['cancelled', 'converted'].includes(parentInquiry.status)) {
      return {
        ok: false,
        status: 409,
        error: { message: 'Inquiry sudah selesai.' },
      } as const
    }
  }

  let productWhere: ProductWhereInput = {
    isActive: true,
  }

  if (parentInquiry) {
    const inquiryItems: unknown[] = Array.isArray(parentInquiry.items)
      ? parentInquiry.items
      : []

    const itemCodes = [
      ...new Set(
        inquiryItems.flatMap((item) => {
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

    const inquiryProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        itemCode: { in: itemCodes },
      },
      select: { id: true },
    })

    productWhere = {
      id: {
        in: inquiryProducts.map((product) => product.id),
      },
    }
  } else if (actor.role === 'customer') {
    productWhere =
      kind === 'order'
        ? await customerPurchasedProductFilter(req)
        : await customerUnpurchasedProductFilter(req)
  }

  const ids = items.map((item) => BigInt(item.productId))

  const products = await prisma.product.findMany({
    where: {
      AND: [
        { isActive: true },
        productWhere,
        { id: { in: ids } },
      ],
    },
  })

  if (products.length !== ids.length) {
    const message = parentInquiry
      ? 'Pesanan hanya untuk produk yang ada pada inquiry tersebut.'
      : actor.role === 'customer'
        ? kind === 'order'
          ? 'Pesanan hanya untuk produk aktif yang pernah Anda beli.'
          : 'Penawaran hanya untuk produk saran aktif yang belum pernah Anda beli.'
        : 'Produk tidak valid atau tidak aktif.'

    return {
      ok: false,
      status: 400,
      error: { message },
    } as const
  }

  // Only customers must explicitly accept increased prices.
  if (kind === 'order' && actor.role === 'customer') {
    const priceChanges = await priceIncreaseCheck(customerId, items)

    if (priceChanges.length && !priceAccepted) {
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
  }

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

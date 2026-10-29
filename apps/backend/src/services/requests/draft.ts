
import type { Response } from 'express'
import type { AuthenticatedRequest } from '@auth'
import type { Actor } from './access'
import { prisma } from '@/utils'
import { customerPurchasedProductFilter } from '@/services/customer-catalog'
import {
  priceIncreaseCheck,
  priceableCustomer,
  pricesForItems,
  refreshCustomerPrices,
  round6,
} from '@/services/pricing'
import type {
  PortalRequest,
  Product,
} from '@/generated/prisma/client'
import type {
  PortalRequestUpdateInput,
} from '@/generated/prisma/models'
import type { InputJsonValue } from '@prisma/client/runtime/client'

type DraftItemInput = {
  productId: string
  qty: number
}

type DraftItemSnapshot = {
  product: Product
  qty: number
  price?: number
  currency?: string | null
  priceSource?: string | null
  lineTotal?: number
}

type PreviousDraftItem = {
  product?: { id?: string | number | bigint }
  productId?: string | number | bigint
  price?: number | null
  acceptedPrice?: number | null
  currency?: string | null
  priceSource?: string | null
}

type NormalizedItem = {
  productId: string
  qty: number
  price: number | null
}

type DraftItemsResult =
  | { ok: true; items: DraftItemSnapshot[] | null }
  | { ok: false }

const fail = (
  res: Response,
  status: number,
  message: string,
): false => {
  res.status(status).json({ message })
  return false
}

const toJsonValue = (value: unknown): InputJsonValue =>
  JSON.parse(
    JSON.stringify(value, (_, current: unknown) =>
      typeof current === 'bigint'
        ? current.toString()
        : current,
    ),
  ) as InputJsonValue

const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)

const parseId = (value: unknown): string | null => {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'bigint'
  ) {
    return null
  }

  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    return null
  }

  const id = String(value)

  return /^[1-9]\d*$/.test(id) ? id : null
}

const parseQty = (value: unknown): number | null =>
  typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= 100000
    ? value
    : null

const parsePrice = (value: unknown): number | null => {
  if (value === null || value === undefined) return null

  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
    ? value
    : null
}

const parsePreviousItems = (
  value: unknown,
): PreviousDraftItem[] => {
  if (!Array.isArray(value)) return []

  return value.flatMap((item): PreviousDraftItem[] => {
    if (!isRecord(item)) return []

    const product = isRecord(item.product)
      ? item.product
      : null

    const id = parseId(product?.id ?? item.productId)
    if (!id) return []

    return [{
      productId: id,
      price: parsePrice(item.price),
      currency:
        typeof item.currency === 'string'
          ? item.currency
          : null,
      priceSource:
        typeof item.priceSource === 'string'
          ? item.priceSource
          : null,
    }]
  })
}

const normalizeDraftItems = (
  value: unknown,
): NormalizedItem[] | null => {
  if (!Array.isArray(value) || !value.length) {
    return null
  }

  const result: NormalizedItem[] = []

  for (const item of value) {
    if (!isRecord(item)) return null

    const product = isRecord(item.product)
      ? item.product
      : null

    const productId = parseId(
      product?.id ?? item.productId,
    )
    const qty = parseQty(item.qty)

    if (!productId || qty === null) return null

    const rawPrice = item.price ?? item.acceptedPrice
    const price = parsePrice(rawPrice)

    if (rawPrice != null && price === null) {
      return null
    }

    result.push({ productId, qty, price })
  }

  return result
}

const hasDuplicateIds = (
  items: { productId: string }[],
): boolean =>
  new Set(items.map((item) => item.productId)).size !==
  items.length

const refreshPrices = async (
  customerId: bigint,
  products: Product[],
): Promise<void> => {
  const customer = await priceableCustomer(customerId)

  if (!customer) return

  await refreshCustomerPrices(
    customer,
    [...new Set(products.map((p) => p.itemCode))],
  )
}

// Preserve original reference prices when editing a draft.
export const prepareDraftItems = async (
  row: PortalRequest,
  items: DraftItemInput[] | undefined,
  data: PortalRequestUpdateInput,
  res: Response,
): Promise<DraftItemsResult> => {
  if (items === undefined) {
    return { ok: true, items: null }
  }

  const normalized = normalizeDraftItems(items)

  if (!normalized) {
    fail(res, 400, 'Item draft tidak valid.')
    return { ok: false }
  }

  if (hasDuplicateIds(normalized)) {
    fail(res, 400, 'Produk duplikat.')
    return { ok: false }
  }

  const ids = normalized.map((item) => BigInt(item.productId))

  const products = await prisma.product.findMany({
    where: {
      id: { in: ids },
      isActive: true,
    },
  })

  if (products.length !== ids.length) {
    fail(res, 400, 'Produk tidak ditemukan atau tidak aktif.')
    return { ok: false }
  }

  const productMap = new Map(
    products.map((product) => [String(product.id), product]),
  )

  const previousItems = parsePreviousItems(row.items)

  const oldById = new Map(
    previousItems.map((item) => [
      String(item.productId),
      item,
    ]),
  )

  await refreshPrices(row.customerId, products)

  const currentPrices = await pricesForItems(
    row.customerId,
    normalized,
  )

  const nextItems: DraftItemSnapshot[] = normalized.map((item) => {
    const product = productMap.get(item.productId)!

    const previous = oldById.get(item.productId)
    const current = currentPrices.get(product.itemCode)

    const price = previous?.price ?? current?.price ?? null
    const currency =
      previous?.currency ?? current?.currency ?? null
    const priceSource =
      previous?.priceSource ?? current?.source ?? null

    return {
      product,
      qty: item.qty,
      ...(price !== null
        ? {
          price,
          currency,
          priceSource,
          lineTotal: round6(item.qty * price),
        }
        : {}),
    }
  })

  data.items = toJsonValue(nextItems)

  return { ok: true, items: nextItems }
}

const validateCustomerSubmission = async (
  req: AuthenticatedRequest,
  res: Response,
  customerId: bigint,
  items: NormalizedItem[],
  priceAccepted: boolean,
): Promise<boolean> => {
  const ids = items.map((item) => BigInt(item.productId))

  const allowed = await customerPurchasedProductFilter(req)

  const allowedProducts = await prisma.product.findMany({
    where: {
      ...allowed,
      id: { in: ids },
    },
    select: { id: true },
  })

  if (allowedProducts.length !== ids.length) {
    return fail(
      res,
      403,
      'Draft berisi produk yang tidak dapat dipesan customer. Hubungi sales.',
    )
  }

  const changes = await priceIncreaseCheck(customerId, items)

  if (changes.length && !priceAccepted) {
    res.status(409).json({
      code: 'PRICE_INCREASED',
      priceChanges: changes,
      message: 'Harga produk naik.',
    })
    return false
  }

  return true
}

// Revalidate all products and prices before submission.
export const prepareDraftSubmission = async (
  req: AuthenticatedRequest,
  res: Response,
  row: PortalRequest,
  actor: Actor,
  effectiveStatus: string,
  nextItems: DraftItemSnapshot[] | null,
  priceAccepted: boolean,
  data: PortalRequestUpdateInput,
): Promise<boolean> => {
  if (row.status !== 'draft' || effectiveStatus !== 'pending') {
    return true
  }

  const normalized = normalizeDraftItems(
    nextItems ?? row.items,
  )

  if (!normalized) {
    return fail(res, 400, 'Item draft tidak valid.')
  }

  if (hasDuplicateIds(normalized)) {
    return fail(res, 400, 'Produk duplikat.')
  }

  const ids = normalized.map((item) => BigInt(item.productId))

  const products = await prisma.product.findMany({
    where: {
      id: { in: ids },
      isActive: true,
    },
  })

  if (products.length !== ids.length) {
    return fail(res, 400, 'Produk tidak aktif.')
  }

  if (actor.role === 'customer') {
    const valid = await validateCustomerSubmission(
      req,
      res,
      row.customerId,
      normalized,
      priceAccepted,
    )

    if (!valid) return false
  }

  await refreshPrices(row.customerId, products)

  const prices = await pricesForItems(
    row.customerId,
    normalized,
  )

  const sources = new Set<string>()

  const productMap = new Map(
    products.map((product) => [
      String(product.id),
      product,
    ]),
  )

  const snapshot = normalized.map((item) => {
    const product = productMap.get(item.productId)!
    const price = prices.get(product.itemCode)

    if (price) sources.add(price.source)

    return {
      product,
      qty: item.qty,
      ...(price
        ? {
          price: price.price,
          currency: price.currency,
          lineTotal: round6(item.qty * price.price),
          priceSource: price.source,
        }
        : {}),
    }
  })

  data.items = toJsonValue(snapshot)

  data.priceBasis =
    sources.size === 1
      ? [...sources][0]
      : sources.size > 1
        ? 'mixed'
        : null

  return true
}

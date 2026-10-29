import type { Response } from 'express'
import type { AuthenticatedRequest } from '@auth'
import { prisma } from '@/utils'
import { customerPurchasedProductFilter, customerSuggestedProductFilter } from '@/services/customer-catalog'
import { priceIncreaseCheck, priceableCustomer, pricesForItems, refreshCustomerPrices, round6 } from '@/services/pricing'
import { settleInquiryOrderability } from '@/services/price-alerts'
import { adminRecipients, customerRecipientFor, staffRecipientsFor } from '@/services/audience'
import { generateRequestNumber } from '@/services/order-number'
import { ws } from '@/services/websocket'
import { actorOf, deniedMessage, targetCustomer, customerSelect } from '@/services/requests/access'
import { serialize } from '@/services/requests/serializer'
import { PortalRequest } from '@/generated/prisma/client'
import { ProductWhereInput } from '@/generated/prisma/models'


type SnapshotItem = {
  productId: string | number
  qty: number
}

export const createRequest = async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req)
  if (!actor) return res.status(403).json({ message: deniedMessage(req) })

  const body = req.body ?? {}
  const { kind, items, notes = '', priceAccepted = false, inquiryId, status: bodyStatus } = body
  const requestedStatus = bodyStatus === 'draft' ? 'draft' : 'pending'

  if (requestedStatus === 'draft' && kind !== 'order') {
    return res.status(400).json({
      message: 'Draft hanya tersedia untuk order.',
    })
  }

  if (
    !['order', 'quote'].includes(kind) ||
    !Array.isArray(items) ||
    !items.length ||
    items.length > 200 ||
    typeof notes !== 'string' ||
    notes.length > 5000 ||
    typeof priceAccepted !== 'boolean' ||
    (bodyStatus !== undefined && bodyStatus !== 'draft' && bodyStatus !== 'pending') ||
    (inquiryId !== undefined && inquiryId !== null && typeof inquiryId !== 'string')
  ) {
    return res.status(400).json({ message: 'Permintaan tidak valid.' })
  }

  const target = await targetCustomer(req, actor, body)
  if ('error' in target) return res.status(403).json({ message: target.error })
  const customerId = target.id

  const ids: bigint[] = []
  for (const item of items) {
    if (!item || !/^\d+$/.test(String(item.productId))) {
      return res.status(400).json({ message: 'Produk atau jumlah tidak valid.' })
    }
    if (
      kind === 'order' &&
      (!Number.isSafeInteger(item.qty) || item.qty < 1 || item.qty > 100000)
    ) {
      return res.status(400).json({ message: 'Produk atau jumlah tidak valid.' })
    }
    ids.push(BigInt(String(item.productId)))
  }
  if (new Set(ids.map(String)).size !== ids.length)
    return res.status(400).json({ message: 'Produk duplikat.' })

  let parentInquiry: PortalRequest | null = null
  if (inquiryId) {
    parentInquiry = await prisma.portalRequest.findUnique({
      where: { id: String(inquiryId) },
      include: { customer: { select: customerSelect } },
    })
    if (!parentInquiry || parentInquiry.kind !== 'quote')
      return res.status(404).json({ message: 'Inquiry tidak ditemukan.' })
    if (String(parentInquiry.customerId) !== String(customerId))
      return res.status(403).json({ message: 'Inquiry bukan milik pelanggan ini.' })
    if (['cancelled', 'converted'].includes(parentInquiry.status))
      return res.status(409).json({ message: 'Inquiry sudah selesai.' })
  }

  const id = await generateRequestNumber(kind)

  // A customer's own order is limited to what they already buy; their inquiry is
  // about products they have never bought. Staff pick from the whole catalog,
  // because they know what the customer asked for. An order started from an
  // inquiry is the third case: the customer may order exactly what they asked a
  // price for, which is the deal path in requirement four.
  let productWhere: ProductWhereInput = { isActive: true }
  if (parentInquiry) {
    const inquiryItems: unknown[] = Array.isArray(parentInquiry.items)
      ? parentInquiry.items
      : []

    const itemCodes = [
      ...new Set(
        inquiryItems
          .map((item) => {
            if (!item || typeof item !== 'object' || !('product' in item)) {
              return null
            }

            const product = item.product

            if (!product || typeof product !== 'object' || !('itemCode' in product)) {
              return null
            }

            return product.itemCode
          })
          .filter((code): code is string => typeof code === 'string'),
      ),
    ]

    const productsOfInquiry = await prisma.product.findMany({
      where: { isActive: true, itemCode: { in: itemCodes } },
      select: { id: true },
    })

    productWhere = {
      id: { in: productsOfInquiry.map((product) => product.id) },
    }
  } else if (actor.role === 'customer') {
    productWhere =
      kind === 'order'
        ? await customerPurchasedProductFilter(req)
        : await customerSuggestedProductFilter(req)
  }
  const products = await prisma.product.findMany({
    where: { ...productWhere, id: { in: ids } },
  })
  if (products.length !== ids.length)
    return res.status(400).json({
      message: parentInquiry
        ? 'Pesanan hanya untuk produk yang ada pada inquiry tersebut.'
        : actor.role === 'customer'
          ? kind === 'order'
            ? 'Pesanan hanya untuk produk aktif yang pernah Anda beli.'
            : 'Penawaran hanya untuk produk saran aktif yang belum pernah Anda beli.'
          : 'Produk tidak valid atau tidak aktif.',
    })

  // Save draft with server-resolved prices as the original price reference.
  // Draft creation does not trigger order notifications or SAP processing.
  if (requestedStatus === 'draft') {
    const customerForPrices = await priceableCustomer(customerId)

    if (customerForPrices) {
      await refreshCustomerPrices(
        customerForPrices,
        [...new Set(products.map((p) => p.itemCode))],
      )
    }

    const linePrices = await pricesForItems(customerId, items)

    const snapshot = items.map((item: SnapshotItem) => {
      const product = products.find(
        (p) => String(p.id) === String(item.productId),
      )!

      const price = linePrices.get(product.itemCode)

      return {
        product,
        qty: item.qty,
        ...(price
          ? {
            price: price.price,
            currency: price.currency,
            priceSource: price.source,
            lineTotal: round6(item.qty * price.price),
          }
          : {}),
      }
    })

    const row = await prisma.portalRequest.create({
      data: {
        id,
        customerId,
        kind: 'order',
        notes,
        items: JSON.parse(JSON.stringify(snapshot)),
        status: 'draft',
        source: actor.role === 'customer' ? 'customer' : 'sales',
        createdById: Number(req.user!.id),
        inquiryId: parentInquiry ? parentInquiry.id : null,
      },
      include: {
        customer: { select: customerSelect },
        createdBy: { select: { name: true } },
      },
    })

    return res.status(201).json({
      data: serialize(row, undefined, actor),
    })
  }

  // Price gate for orders.
  //
  // An order may be placed at the price the customer was last shown. If any
  // price has risen since they saw it, the order is held until they explicitly
  // accept the new price. Unchanged or lower prices proceed straight through,
  // so this only ever blocks on increases. Staff enter prices themselves, so the
  // gate is the customer's alone to satisfy.
  if (kind === 'order' && actor.role === 'customer') {
    const priceChanges = await priceIncreaseCheck(customerId, items)
    if (priceChanges.length && !priceAccepted) {
      return res.status(409).json({
        message:
          'Harga beberapa produk sudah naik sejak terakhir Anda lihat. Konfirmasi harga terbaru untuk melanjutkan pesanan.',
        code: 'PRICE_INCREASED',
        priceChanges,
      })
    }
  }

  // Prices actually applied, so the snapshot carries the figure staff will copy
  // into SAP rather than a figure the customer hoped for. Repeat items resolve to
  // their actual invoice price, brand new ones to the price list. The cache is
  // refreshed first, because a conversion is the moment an inquiry's negotiated
  // price becomes the one this order is paid at, and the snapshot must not
  // repeat a price list figure that is no longer the one on offer.
  const customerForPrices = await priceableCustomer(customerId)
  if (customerForPrices) {
    const productCodes = [...new Set(products.map((product) => product.itemCode))]
    await refreshCustomerPrices(customerForPrices, productCodes)
  }
  const linePrices = await pricesForItems(customerId, items)
  const sources = new Set<string>()
  const snapshot = items.map((item: SnapshotItem) => {
    const product = products.find((p) => String(p.id) === String(item.productId))
    const price = product ? linePrices.get(product.itemCode) : undefined
    if (price) sources.add(price.source)
    return {
      product,
      qty: item.qty ?? 1,
      ...(price
        ? {
          price: price.price,
          currency: price.currency,
          lineTotal: kind === 'order' ? round6((item.qty ?? 1) * price.price) : null,
          priceSource: price.source,
        }
        : {}),
    }
  })
  const priceBasis = sources.size === 1 ? [...sources][0] : sources.size > 1 ? 'mixed' : null

  // Product snapshots use server data, never client-provided names, pricing or identity.
  const row = await prisma.portalRequest.create({
    data: {
      id,
      customerId,
      kind,
      notes,
      items: JSON.parse(JSON.stringify(snapshot)),
      status: body?.status === 'draft' ? 'draft' : 'pending',
      source: actor.role === 'customer' ? 'customer' : 'sales',
      createdById: Number(req.user!.id),
      priceBasis,
      inquiryId: parentInquiry ? parentInquiry.id : null,
    },
    include: { customer: { select: customerSelect }, createdBy: { select: { name: true } } },
  })

  if (parentInquiry) {
    await prisma.portalRequest.update({
      where: { id: parentInquiry.id },
      data: { status: 'converted', convertedOrderId: row.id },
    })
    await prisma.followUpNote.create({
      data: {
        requestId: parentInquiry.id,
        authorId: null,
        authorName: 'Portal',
        authorRole: 'system',
        source: 'system',
        visibility: 'customer',
        message: `Inquiry ini dikonversi menjadi pesanan ${row.id}.`,
      },
    })
    ws.emitOrderStatusChanged(
      parentInquiry.id,
      String(parentInquiry.customerId),
      parentInquiry.status,
      'converted',
      'quote',
    )
  }

  const kindLabel = kind === 'quote' ? 'Permintaan Penawaran' : 'Pesanan'
  const customerLabel = row.customer.CardName || row.customer.CntctPrsn || 'pelanggan'
  const recipients = actor.role === 'customer' ? await staffRecipientsFor(row.customer) : []
  if (actor.role !== 'customer') {
    const customerUser = await customerRecipientFor(customerId)
    if (customerUser) recipients.push(customerUser)
  }
  if (actor.role === 'sales_admin') {
    for (const admin of await adminRecipients()) recipients.push(admin)
  }

  const createdNotifications = await prisma.notification.createManyAndReturn({
    data: recipients.map((user) => ({
      userId: user.id,
      title:
        actor.role === 'customer'
          ? `${kindLabel} baru dari ${customerLabel}`
          : `${kindLabel} baru untuk ${customerLabel}`,
      message:
        actor.role === 'customer'
          ? `${kindLabel} ${row.id} menunggu tindakan.`
          : `${kindLabel} ${row.id} dibuat oleh sales ${req.user!.name}.`,
      type: kind === 'quote' ? 'new_quote' : 'new_order',
      relatedId: row.id,
      kind,
    })),
  })
  for (const notification of createdNotifications) ws.emitNotificationCreated(notification)

  const itemsWithPricing = snapshot.map((item) => ({
    productId: String(item.product?.id ?? ''),
    productName: item.product?.itemName ?? 'Unknown',
    qty: item.qty,
    price: item.price ?? 0,
    total: item.lineTotal ?? 0,
  }))

  const totalAmount = itemsWithPricing.reduce((sum: number, item) => sum + item.total, 0)
  ws.emitOrderCreated(
    row.id,
    String(row.customerId),
    customerLabel,
    kind,
    itemsWithPricing,
    totalAmount,
  )

  // An inquiry is created on the price list, but it may already be priced: if
  // every line carries a price of its own the portal can open it straight away
  // instead of making anyone wait for a price that already arrived.
  if (kind === 'quote' && (await settleInquiryOrderability(row.id))) {
    const settled = await prisma.portalRequest.findUniqueOrThrow({
      where: { id: row.id },
      include: { customer: { select: customerSelect }, createdBy: { select: { name: true } } },
    })
    return res.status(201).json({ data: serialize(settled, undefined, actor) })
  }

  return res.status(201).json({ data: serialize(row, undefined, actor) })
}

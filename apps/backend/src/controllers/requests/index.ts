import type { Response } from 'express'
import type { AuthenticatedRequest } from '@auth'
import { prisma } from '@/utils'
import { currentCustomer, customerProductFilter } from '@/services/customer-catalog'
import {
  priceIncreaseCheck,
  priceableCustomer,
  pricesForItems,
  productNames,
  refreshCustomerPrices,
  round6,
} from '@/services/pricing'
import { settleInquiryOrderability } from '@/services/price-alerts'
import {
  adminRecipients,
  customerRecipientFor,
  staffRecipientsFor,
} from '@/services/audience'
import { linkSapDocument, reconcileRequests } from '@/services/sap-sync'
import { ws } from '@/services/websocket'

const customerSelect = {
  id: true,
  CardCode: true,
  CardName: true,
  CntctPrsn: true,
  Phone1: true,
  Cellular: true,
  SalesName: true,
  SlpCode: true,
}

/**
 * How a portal request stands in the system, for the UI.
 *
 * Once a request is linked to a document, the customer follows that document
 * rather than an internal guess: "Open" means the document is still being worked
 * on, "Closed" means it is finished, "Canceled" means it will not happen.
 */
const sapView = (row: any, views?: Map<string, any>) => {
  if (!row.sapDocEntry) return null
  const view = views?.get(row.id) ?? {
    companyId: row.sapCompanyId,
    docEntry: row.sapDocEntry,
    docNum: row.sapDocNum,
    docStatus:
      row.sapDocStatus?.trim() === 'C'
        ? 'closed'
        : row.sapDocStatus?.trim() === 'O'
          ? 'open'
          : 'unknown',
    canceled: row.sapCanceled?.trim() === 'Y',
    syncedAt: row.sapSyncedAt?.toISOString() ?? null,
  }
  return {
    ...view,
    status:
      view.canceled ? 'canceled' : view.docStatus === 'closed' ? 'closed' : view.docStatus === 'open' ? 'open' : 'unknown',
  }
}

/**
 * The customer's side of a request.
 *
 * A viewer is required so staff-only fields can be dropped instead of merely
 * hidden by the UI: the payload the customer receives must not carry them at
 * all, otherwise the internal note is one devtools tab away.
 */
const serialize = (row: any, views?: Map<string, any>, viewer?: Actor | null) => {
  const forCustomer = viewer?.role === 'customer'
  return {
    id: row.id,
    kind: row.kind,
    userId: String(row.customerId),
    userName: row.customer.CntctPrsn || row.customer.CardName,
    company: row.customer.CardName,
    cardCode: row.customer.CardCode,
    phone: row.customer.Cellular || row.customer.Phone1,
    salesName: row.customer.SalesName,
    items: row.items,
    // Reconciling against SAP can move the status during this very read, so the
    // value the caller sees is the reconciled one, not the row we read a moment ago.
    status: views?.get(row.id)?.portalStatus ?? row.status,
    // customer | sales: who raised it. A sales-entered order has to look
    // different from the customer's own, otherwise the customer is surprised by
    // an order they did not place.
    source: row.source ?? 'customer',
    createdByName: row.createdBy?.name ?? null,
    priceBasis: row.priceBasis ?? null,
    inquiryId: row.inquiryId ?? null,
    convertedOrderId: row.convertedOrderId ?? null,
    sap: sapView(row, views),
    createdAt: row.createdAt,
    notes: row.notes,
    ...(forCustomer ? {} : { salesNotes: row.salesNotes ?? null }),
  }
}

/**
 * Who is asking, and what are they allowed to reach.
 *
 * A sales_admin without an SLP assignment has no territory: seeing everything
 * would expose every customer in the company, so those accounts are refused
 * instead of silently widened.
 */
type Actor =
  | { role: 'admin' }
  | { role: 'sales_admin'; slpCode: number }
  | { role: 'customer' }

const actorOf = (req: AuthenticatedRequest): Actor | null => {
  const role = req.user?.role.name
  if (role === 'admin') return { role: 'admin' }
  if (role === 'sales_admin') {
    if (req.user?.slpCode == null) return null
    return { role: 'sales_admin', slpCode: req.user.slpCode }
  }
  if (role === 'customer') return { role: 'customer' }
  return null
}

const TERRITORY_ERROR = 'Akun sales belum memiliki SlpCode. Hubungi admin.'

export const listRequests = async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req)
  if (!actor) return res.status(403).json({ message: deniedMessage(req) })

  let whereClause: any = {}
  if (actor.role === 'customer') {
    const customer = await currentCustomer(req)
    if (!customer) return res.status(403).json({ message: 'Akun pelanggan tidak aktif.' })
    whereClause = { customerId: BigInt(String(customer.id)) }
  } else if (actor.role === 'sales_admin') {
    whereClause = { customer: { SlpCode: actor.slpCode } }
  }

  const rows = await prisma.portalRequest.findMany({
    where: whereClause,
    include: { customer: { select: customerSelect }, createdBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  // Reading the list is also when SAP is consulted, so a delivery that closed
  // in SAP shows up without anyone waiting for the next manual status change.
  const views = await reconcileRequests(rows)
  res.setHeader('Cache-Control', 'no-store')
  return res.json({ data: rows.map((row) => serialize(row, views, actor)) })
}

export const getRequest = async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req)
  if (!actor) return res.status(403).json({ message: deniedMessage(req) })
  if (actor.role === 'customer') {
    const customer = await currentCustomer(req)
    if (!customer) return res.status(403).json({ message: 'Akun pelanggan tidak aktif.' })
  }
  const row = await prisma.portalRequest.findUnique({
    where: { id: String(req.params.id) },
    include: { customer: { select: customerSelect }, createdBy: { select: { name: true } } },
  })
  if (!row) return res.status(404).json({ message: 'Permintaan tidak ditemukan.' })
  if (actor.role === 'customer' && String(row.customerId) !== String(req.user!.customerId))
    return res.status(403).json({ message: 'Akses ditolak.' })
  if (
    actor.role === 'sales_admin' &&
    String(row.customer.SlpCode) !== String(actor.slpCode)
  )
    return res
      .status(403)
      .json({ message: 'Akses ditolak. Hanya pelanggan dengan SlpCode Anda.' })
  res.setHeader('Cache-Control', 'no-store')
  // Opening an inquiry is also when the portal asks whether the price has
  // landed, so an inquiry whose price was written in the system is already
  // orderable by the time anybody is looking at it.
  if (await settleInquiryOrderability(row.id)) {
    const settled = await prisma.portalRequest.findUniqueOrThrow({
      where: { id: row.id },
      include: { customer: { select: customerSelect }, createdBy: { select: { name: true } } },
    })
    return res.json({ data: serialize(settled, undefined, actor) })
  }
  const views = await reconcileRequests([row])
  return res.json({ data: serialize(row, views, actor) })
}

const deniedMessage = (req: AuthenticatedRequest) => {
  return req.user?.role.name === 'sales_admin'
    ? TERRITORY_ERROR
    : 'Akun pelanggan tidak aktif.'
}

/**
 * The customer a request is being written for.
 *
 * Staff name the customer explicitly; a sales_admin may only do so inside their
 * own territory. Customers simply resolve to themselves.
 */
const targetCustomer = async (
  req: AuthenticatedRequest,
  actor: Actor,
  body: any,
): Promise<{ id: bigint; CardCode: string | null } | { error: string }> => {
  if (actor.role === 'customer') {
    const customer = await currentCustomer(req)
    if (!customer) return { error: 'Hanya pelanggan aktif dapat mengirim permintaan.' }
    return { id: BigInt(String(customer.id)), CardCode: customer.CardCode }
  }

  const raw = body?.customerId
  if (raw === undefined || raw === null || !/^\d+$/.test(String(raw)))
    return { error: 'Pelanggan tujuan wajib dipilih.' }

  const customer = await prisma.customers.findUnique({
    where: { id: BigInt(String(raw)) },
    select: { id: true, CardCode: true, NonActive: true, SlpCode: true },
  })
  if (!customer) return { error: 'Pelanggan tidak ditemukan.' }
  if (!customer.CardCode || customer.NonActive === 'Y')
    return { error: 'Pelanggan tidak aktif atau tidak memiliki CardCode.' }
  if (actor.role === 'sales_admin' && String(customer.SlpCode) !== String(actor.slpCode))
    return { error: 'Akses ditolak. Hanya pelanggan dengan SlpCode Anda.' }
  return { id: BigInt(String(customer.id)), CardCode: customer.CardCode }
}

export const createRequest = async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req)
  if (!actor) return res.status(403).json({ message: deniedMessage(req) })

  const body = req.body ?? {}
  const { kind, items, notes = '', requestId, priceAccepted = false, inquiryId } = body
  if (
    !['order', 'quote'].includes(kind) ||
    !Array.isArray(items) ||
    !items.length ||
    items.length > 200 ||
    typeof notes !== 'string' ||
    notes.length > 5000 ||
    typeof priceAccepted !== 'boolean' ||
    typeof requestId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) ||
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
    // A quote is a request for a price, so it carries no quantity yet. An order
    // does, whether the customer or their sales person placed it.
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

  // An inquiry the customer is ordering from becomes the parent of the order, so
  // the two conversations can be tied together afterwards.
  let parentInquiry: any = null
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

  const id = `${kind === 'order' ? 'ORD' : 'RFQ'}-${requestId}`
  const existing = await prisma.portalRequest.findUnique({
    where: { id },
    include: { customer: { select: customerSelect }, createdBy: { select: { name: true } } },
  })
  if (existing) {
    if (String(existing.customerId) !== String(customerId))
      return res.status(409).json({ message: 'ID permintaan sudah digunakan.' })
    return res.json({ data: serialize(existing, undefined, actor) })
  }

  // A customer's own order is limited to what they already buy; their inquiry is
  // about products they have never bought. Staff pick from the whole catalog,
  // because they know what the customer asked for. An order started from an
  // inquiry is the third case: the customer may order exactly what they asked a
  // price for, which is the deal path in requirement four.
  let productWhere: any = { isActive: true }
  if (parentInquiry) {
    const inquiryItems = Array.isArray(parentInquiry.items) ? (parentInquiry.items as any[]) : []
    const itemCodes = [
      ...new Set(
        inquiryItems
          .map((item) => item?.product?.itemCode)
          .filter((code): code is string => typeof code === 'string'),
      ),
    ]
    const productsOfInquiry = await prisma.product.findMany({
      where: { isActive: true, itemCode: { in: itemCodes } },
      select: { id: true },
    })
    productWhere = { id: { in: productsOfInquiry.map((product) => product.id) } }
  } else if (actor.role === 'customer') {
    productWhere = await customerProductFilter(req)
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
  const snapshot = items.map((item: any) => {
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
      status: 'pending',
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

  const itemsWithPricing = snapshot.map((item: any) => ({
    productId: String(item.product?.id ?? item.productId),
    productName: item.product?.itemName ?? item.product?.name ?? 'Unknown',
    qty: item.qty ?? 1,
    price: item.price ?? 0,
    total: item.lineTotal ?? 0,
  }))
  const totalAmount = itemsWithPricing.reduce((sum: number, item: any) => sum + item.total, 0)
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

const serializeFollowUp = (note: any) => ({
  id: note.id,
  requestId: note.requestId,
  author: {
    id: note.authorId,
    name: note.authorName ?? null,
    username: note.authorName ?? '',
    role: note.authorRole ?? 'customer',
  },
  source: note.source ?? 'user',
  visibility: note.visibility ?? 'customer',
  message: note.message,
  createdAt: note.createdAt,
})

/**
 * Creates and pushes the persisted notification for a new follow-up note.
 *
 * The author never receives their own message. A note that only exists as a
 * live WebSocket frame disappears on reload, so the bell and the notification
 * list both depend on this row being written.
 */
const notifyFollowUp = async (
  request: {
    id: string
    kind: string
    customerId: bigint
    customer: { CardCode: string | null; CardName: string | null; CntctPrsn: string | null; SlpCode: number | null }
  },
  note: { message: string },
  author: { id: number; name: string; staff: boolean },
) => {
  const customerLabel =
    request.customer.CardName || request.customer.CntctPrsn || request.customer.CardCode || 'pelanggan'
  const kindLabel = request.kind === 'quote' ? 'Penawaran' : 'Pesanan'

  let recipients: Array<{ id: number }>
  if (author.staff) {
    const customerUser = await customerRecipientFor(request.customerId)
    recipients = customerUser ? [customerUser] : []
  } else {
    recipients = await staffRecipientsFor(request.customer)
  }

  const targets = recipients.filter((user) => user.id !== author.id)
  if (!targets.length) return

  const notifications = await prisma.notification.createManyAndReturn({
    data: targets.map((user) => ({
      userId: user.id,
      title: author.staff
        ? `${kindLabel} ${request.id}: balasan dari sales`
        : `${kindLabel} ${request.id}: pesan baru dari ${customerLabel}`,
      message: note.message,
      type: 'followup_note',
      relatedId: request.id,
      kind: request.kind,
    })),
  })
  for (const notification of notifications) {
    ws.emitNotificationCreated(notification)
  }
}

export const listFollowUps = async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req)
  if (!actor) return res.status(403).json({ message: deniedMessage(req) })
  if (actor.role === 'customer' && !(await currentCustomer(req)))
    return res.status(403).json({ message: 'Akun pelanggan tidak aktif.' })

  const row = await prisma.portalRequest.findUnique({
    where: { id: String(req.params.id) },
    include: { customer: { select: customerSelect } },
  })
  if (!row) return res.status(404).json({ message: 'Permintaan tidak ditemukan.' })
  if (actor.role === 'customer' && String(row.customerId) !== String(req.user!.customerId))
    return res.status(403).json({ message: 'Akses ditolak.' })
  if (actor.role === 'sales_admin' && String(row.customer.SlpCode) !== String(actor.slpCode))
    return res
      .status(403)
      .json({ message: 'Akses ditolak. Hanya pelanggan dengan SlpCode Anda.' })

  // Internal notes are the staff side of the conversation. A customer asking for
  // them would see margin talk they must never read.
  const notes = await prisma.followUpNote.findMany({
    where: { requestId: row.id, ...(actor.role === 'customer' ? { visibility: 'customer' } : {}) },
    orderBy: { createdAt: 'asc' },
  })
  res.setHeader('Cache-Control', 'no-store')
  return res.json({ data: notes.map(serializeFollowUp) })
}

export const createFollowUp = async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req)
  if (!actor) return res.status(403).json({ message: deniedMessage(req) })

  const { message, visibility = 'customer' } = req.body ?? {}
  if (
    typeof message !== 'string' ||
    message.trim().length === 0 ||
    message.trim().length > 2000 ||
    (visibility !== 'customer' && visibility !== 'internal')
  ) {
    return res.status(400).json({ message: 'Pesan follow-up tidak valid.' })
  }

  const row = await prisma.portalRequest.findUnique({
    where: { id: String(req.params.id) },
    include: { customer: { select: customerSelect } },
  })
  if (!row) return res.status(404).json({ message: 'Permintaan tidak ditemukan.' })
  if (actor.role === 'customer' && String(row.customerId) !== String(req.user!.customerId))
    return res.status(403).json({ message: 'Akses ditolak.' })
  if (actor.role === 'sales_admin' && String(row.customer.SlpCode) !== String(actor.slpCode))
    return res
      .status(403)
      .json({ message: 'Akses ditolak. Hanya pelanggan dengan SlpCode Anda.' })

  // Only staff may keep a note internal, and the customer's own notes are always
  // visible to both sides.
  const noteVisibility = actor.role === 'customer' ? 'customer' : visibility

  const authorId = Number(req.user!.id)
  const authorName = req.user!.name ?? req.user!.username ?? 'System'
  const trimmed = message.trim()
  const note = await prisma.followUpNote.create({
    data: {
      requestId: row.id,
      authorId,
      authorName,
      authorRole: req.user!.role.name,
      source: 'user',
      visibility: noteVisibility,
      message: trimmed,
    },
  })

  if (noteVisibility === 'internal') {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(201).json({ data: serializeFollowUp(note) })
  }

  await notifyFollowUp(
    {
      id: row.id,
      kind: row.kind,
      customerId: BigInt(String(row.customerId)),
      customer: row.customer,
    },
    { message: trimmed },
    { id: authorId, name: authorName, staff: actor.role !== 'customer' },
  )
  ws.emitFollowUpAdded(
    row.id,
    String(row.customerId),
    trimmed,
    row.kind as 'order' | 'quote',
  )
  return res.status(201).json({ data: serializeFollowUp(note) })
}

/**
 * Who may move a request to which status.
 *
 * The two lists are deliberately different. An order is admin's to run; an
 * inquiry is a negotiation the customer's sales person runs, and it is opened for
 * ordering by the price gate rather than by anyone clicking a button.
 */
const FLOW: Record<
  string,
  Record<string, { next: Record<string, Array<'admin' | 'sales' | 'customer' | 'system'>> }>
> = {
  order: {
    pending: { next: { confirmed: ['admin'], cancelled: ['admin'] } },
    confirmed: { next: { processing: ['admin'], cancelled: ['admin'] } },
    processing: { next: { delivered: ['admin'], cancelled: ['admin'] } },
    delivered: { next: {} },
    cancelled: { next: {} },
  },
  quote: {
    pending: { next: { processing: ['sales', 'admin'], cancelled: ['sales', 'admin'] } },
    // ready is reached by the price gate once every line is priced, not by a
    // staff status edit.
    processing: { next: { cancelled: ['sales', 'admin'] } },
    ready: { next: { cancelled: ['sales', 'admin'] } },
    converted: { next: {} },
    cancelled: { next: {} },
  },
}

const actorRoleName = (actor: Actor) =>
  actor.role === 'admin' ? 'admin' : actor.role === 'sales_admin' ? 'sales' : 'customer'

export const updateRequest = async (req: AuthenticatedRequest, res: Response) => {
  const { status, salesNotes } = req.body ?? {}
  const actor = actorOf(req)
  if (!actor) return res.status(403).json({ message: deniedMessage(req) })
  if (actor.role === 'customer') return res.status(403).json({ message: 'Akses ditolak. Khusus staf.' })

  const row = await prisma.portalRequest.findUnique({
    where: { id: String(req.params.id) },
    include: { customer: { select: customerSelect } },
  })
  if (!row) return res.status(404).json({ message: 'Permintaan tidak ditemukan.' })
  if (actor.role === 'sales_admin' && String(row.customer.SlpCode) !== String(actor.slpCode))
    return res
      .status(403)
      .json({ message: 'Akses ditolak. Hanya pelanggan dengan SlpCode Anda.' })
  // Sales negotiates inquiries; admin runs orders. A sales person cannot move an
  // order along, and admin-only steps stay admin-only.
  if (row.kind === 'order' && actor.role !== 'admin')
    return res.status(403).json({ message: 'Hanya admin yang dapat memperbarui pesanan.' })

  if (
    typeof status !== 'string' ||
    typeof salesNotes !== 'string' ||
    salesNotes.length > 5000 ||
    !FLOW[row.kind]?.[row.status]
  ) {
    return res.status(400).json({ message: 'Status atau catatan sales tidak valid.' })
  }

  const sameStatus = status === row.status
  const allowedRoles = sameStatus ? [] : (FLOW[row.kind][row.status].next[status] ?? [])
  if (!sameStatus && !allowedRoles.includes(actorRoleName(actor) as any)) {
    return res.status(400).json({
      message: `Status ${row.status} tidak dapat diubah menjadi ${status} oleh peran Anda.`,
    })
  }

  const updated = await prisma.portalRequest.updateMany({
    where: { id: row.id, status: row.status },
    data: { ...(sameStatus ? {} : { status }), salesNotes },
  })
  if (updated.count !== 1)
    return res.status(409).json({ message: 'Status berubah. Muat ulang daftar.' })

  if (!sameStatus) {
    const kindLabel = row.kind === 'quote' ? 'Permintaan Penawaran' : 'Pesanan'
    const customerUser = await customerRecipientFor(BigInt(String(row.customerId)))
    const staffRecipients = await staffRecipientsFor({ SlpCode: row.customer.SlpCode })
    const targets = [
      ...(customerUser ? [customerUser.id] : []),
      ...staffRecipients.map((user) => user.id),
    ].filter((userId) => userId !== Number(req.user!.id))
    if (targets.length) {
      const notifications = await prisma.notification.createManyAndReturn({
        data: targets.map((userId) => ({
          userId,
          title: `${kindLabel} ${row.id} diperbarui`,
          message: `Status sekarang: ${status}.`,
          type: 'status_update',
          relatedId: row.id,
          kind: row.kind,
        })),
      })
      for (const notification of notifications) ws.emitNotificationCreated(notification)
    }
    ws.emitOrderStatusChanged(
      row.id,
      String(row.customerId),
      row.status,
      status,
      row.kind as 'order' | 'quote',
      salesNotes,
    )
  }
  return res.json({ success: true })
}

/**
 * Links a portal order to the SAP document it became.
 *
 * Admin owns this step: it is the moment the order is asserted to exist in SAP.
 * The document may not have reached the sync yet, in which case the link is
 * remembered and picked up automatically on the next read.
 */
export const linkRequestToSap = async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req)
  if (!actor) return res.status(403).json({ message: deniedMessage(req) })
  if (actor.role !== 'admin')
    return res.status(403).json({ message: 'Hanya admin yang dapat menautkan dokumen sistem.' })

  const { docEntry, companyId } = req.body ?? {}
  if (
    !Number.isInteger(docEntry) ||
    docEntry < 1 ||
    (companyId !== undefined && companyId !== null && typeof companyId !== 'string')
  ) {
    return res.status(400).json({ message: 'Nomor dokumen tidak valid.' })
  }

  const row = await prisma.portalRequest.findUnique({
    where: { id: String(req.params.id) },
    include: { customer: { select: customerSelect } },
  })
  if (!row) return res.status(404).json({ message: 'Permintaan tidak ditemukan.' })
  if (row.kind !== 'order')
    return res.status(400).json({ message: 'Hanya pesanan yang memiliki dokumen sistem.' })

  const result = await linkSapDocument(
    {
      id: row.id,
      kind: row.kind,
      status: row.status,
      customerId: BigInt(String(row.customerId)),
      sapCompanyId: row.sapCompanyId,
      sapDocEntry: row.sapDocEntry,
      customer: row.customer,
    },
    { docEntry: docEntry as number, companyId: companyId ?? null },
  )

  const refreshed = await prisma.portalRequest.findUniqueOrThrow({
    where: { id: row.id },
    include: { customer: { select: customerSelect }, createdBy: { select: { name: true } } },
  })

  return res.json({
    success: result.linked,
    message: result.message ?? null,
    data: serialize(
      refreshed,
      result.view ? new Map([[row.id, result.view]]) : undefined,
    ),
  })
}

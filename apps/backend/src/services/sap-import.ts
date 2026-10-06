import { prisma } from '@/utils'
import { round6 } from '@/services/pricing'
import { adminRecipients, customerRecipientFor, staffRecipientsFor } from '@/services/audience'
import { deliveryCoverage, portalStatusFromSap, reconcileRequests } from '@/services/sap-sync'
import { ws } from '@/services/websocket'

/**
 * Puts a SAP order into the portal.
 *
 * An ORDR that only lives in SAP is invisible to the customer: they cannot follow
 * it, ask about it, or be told it was delivered. Importing creates the portal
 * request for that document and links the two ways, so from then on the ordinary
 * reconcile picks up every SAP change - the document is already an order in SAP,
 * so there is nothing to approve and no status to guess.
 *
 * Re-running is safe: a document already imported is reported and left alone,
 * because a second portal order for one ORDR would double the customer's view of a
 * single delivery.
 */

export interface SapImportResult {
  ok: boolean
  message: string
  portalId?: string
  docNum?: number
  status?: string
  lines?: number
}

export const portalIdForSapDoc = (docNum: number) => `ORD-DOC-${docNum}`

interface SapOrderWithLines {
  currency: string | null
  lines: Array<{
    itemCode: string | null
    description: string
    quantity: unknown
    price: unknown
    lineTotal: unknown
  }>
}

/**
 * The order's lines as the portal stores them.
 *
 * Product identity comes from the catalog, never from the SAP row, but a line
 * whose item is not in the catalog keeps its SAP description: the order happened,
 * and blanking it would hide what was actually bought.
 */
export const buildItems = async (order: SapOrderWithLines) => {
  const itemCodes = [
    ...new Set(
      order.lines
        .map((line) => line.itemCode)
        .filter((code): code is string => typeof code === 'string' && code.length > 0),
    ),
  ]
  const products = itemCodes.length
    ? await prisma.product.findMany({ where: { itemCode: { in: itemCodes } } })
    : []
  const productByCode = new Map(products.map((product) => [product.itemCode, product]))

  return order.lines.map((line) => {
    const product = line.itemCode ? productByCode.get(line.itemCode) : undefined
    const qty = Number(line.quantity ?? 0)
    const price =
      line.price != null
        ? Number(line.price)
        : line.lineTotal != null
          ? Number(line.lineTotal) / (qty || 1)
          : null
    return {
      product: product
        ? {
            id: String(product.id),
            itemCode: product.itemCode,
            itemName: product.itemName,
            salesUnit: product.salesUnit,
            productCategory: product.productCategory,
          }
        : {
            id: null,
            itemCode: line.itemCode ?? null,
            itemName: line.description,
            salesUnit: null,
            productCategory: null,
          },
      qty,
      ...(price != null
        ? {
            price: round6(price),
            currency: order.currency ?? null,
            lineTotal: round6(qty * price),
            // The figure on the ORDR is what was agreed in SAP, not a catalogue
            // guess, so it is labelled as an actual price.
            priceSource: 'actual',
          }
        : {}),
    }
  })
}

/** Completes an already imported order whose lines only now arrived. */
export const fillSapOrderItems = async (request: { id: string }, order: SapOrderWithLines) => {
  const items = await buildItems(order)
  await prisma.portalRequest.update({
    where: { id: request.id },
    data: { items: JSON.parse(JSON.stringify(items)), priceBasis: 'actual' },
  })
  await prisma.followUpNote.create({
    data: {
      requestId: request.id,
      authorId: null,
      authorName: 'Portal',
      authorRole: 'system',
      source: 'system',
      visibility: 'customer',
      message: `Rincian item dari dokumen sistem sudah tersedia: ${items.length} baris.`,
    },
  })
  return items.length
}

export const eligibleSapOrders = (take = 50) => {
  return prisma.salesOrder.findMany({
    where: { portalRef: null },
    orderBy: [{ docDate: 'desc' }, { docEntry: 'desc' }],
    include: { lines: { orderBy: { lineNum: 'asc' } } },
    take,
  })
}

const withLines = { lines: { orderBy: { lineNum: 'asc' as const } } }

/**
 * The document to import: the one that was named, or the newest one nobody has
 * imported yet. A named document is looked up even when it is already linked, so
 * re-running reports what happened instead of claiming there is nothing to do.
 */
export const resolveSapOrder = async (target: { docNum?: number; docEntry?: number }) => {
  if (target.docNum == null && target.docEntry == null) return (await eligibleSapOrders())[0] ?? null
  return prisma.salesOrder.findFirst({
    where: target.docEntry != null ? { docEntry: target.docEntry } : { docNum: target.docNum },
    orderBy: { updatedAt: 'desc' },
    include: withLines,
  })
}

export const importSapOrder = async (
  target: { docNum?: number; docEntry?: number } = {},
): Promise<SapImportResult> => {
  const order = await resolveSapOrder(target)
  const named = target.docNum != null || target.docEntry != null

  if (!order) {
    return {
      ok: false,
      message: named
        ? `Dokumen ${target.docEntry ?? target.docNum} tidak ada di data sinkron sistem.`
        : 'Tidak ada dokumen sistem yang belum terhubung ke portal.',
    }
  }

  const customer = await prisma.customers.findFirst({
    where: { CardCode: order.cardCode },
    select: { id: true, CardCode: true, CardName: true, SlpCode: true },
  })
  if (!customer) {
    // The portal belongs to customers, not to SAP codes. Without the customer row
    // there is nobody to show this to, so it is refused rather than invented.
    return {
      ok: false,
      message: `Dokumen ${order.docNum} milik CardCode ${order.cardCode}, yang tidak ada di master pelanggan portal.`,
      docNum: order.docNum,
    }
  }

  const id = portalIdForSapDoc(order.docNum)
  if (order.portalRef && order.portalRef !== id) {
    return {
      ok: false,
      message: `Dokumen ${order.docNum} sudah terhubung ke permintaan lain (${order.portalRef}). Satu dokumen sistem hanya boleh memiliki satu pesanan portal.`,
      docNum: order.docNum,
    }
  }

  // RDR1 may not be synced yet. The order still happened, so it is published -
  // but with the gap said out loud, because an order that silently lists no
  // products reads as "nothing was ordered" rather than "we are missing lines".
  const missingLines = order.lines.length === 0

  const existing = await prisma.portalRequest.findUnique({ where: { id } })
  if (existing) {
    const existingItems = Array.isArray(existing.items) ? (existing.items as unknown[]) : []
    // The lines of a SAP order arrive in their own sync. An order imported while
    // its RDR1 was still missing is completed rather than left half empty and
    // never revisited.
    if (existingItems.length === 0 && order.lines.length > 0) {
      const filled = await fillSapOrderItems(existing, order)
      // The lines were missing before, so the delivery could not be measured and
      // the status had to sit at "confirmed". Now that they exist the invoices can
      // be compared against them, so the status is brought up to date here instead
      // of waiting for the next poll.
      await reconcileRequests([
        await prisma.portalRequest.findUniqueOrThrow({
          where: { id: existing.id },
          select: {
            id: true,
            kind: true,
            status: true,
            customerId: true,
            sapCompanyId: true,
            sapDocEntry: true,
            customer: {
              select: { CardCode: true, CardName: true, CntctPrsn: true, SlpCode: true },
            },
          },
        }),
      ])
      const reconciled = await prisma.portalRequest.findUniqueOrThrow({
        where: { id: existing.id },
        select: { status: true },
      })
      return {
        ok: true,
        message: `Dokumen ${order.docNum} diimpor sebagai ${existing.id}, rincian item baru dilengkapi (${filled} baris).`,
        portalId: existing.id,
        docNum: order.docNum,
        status: reconciled.status,
        lines: filled,
      }
    }
    return {
      ok: true,
      message: `Dokumen ${order.docNum} sudah diimpor sebagai ${existing.id}. Tidak ada yang diubah.`,
      portalId: existing.id,
      docNum: order.docNum,
      status: existing.status,
      lines: existingItems.length,
    }
  }

  const items = await buildItems(order)

  // The document already exists in SAP, so the portal must not sit at "pending":
  // what is left is to follow it.
  //
  // The invoices are consulted here rather than left to the first poll. An order
  // whose goods were delivered before anyone thought to publish it must open at
  // "selesai", not at "dikonfirmasi" for the next fifteen minutes and then move
  // on its own: a customer looking at a finished order and reading it as unfinished
  // is the exact mistake this avoids.
  const coverage = await deliveryCoverage([order.docEntry])
  const status = portalStatusFromSap(order, 'confirmed', coverage.get(order.docEntry) ?? null) ?? 'confirmed'

  // Nothing is written into the customer note: that field is what the customer
  // themselves typed, and filling it with import metadata reads on the order
  // detail as if the customer had asked for it. The document number is already
  // shown by the order header, which is where someone looking for it looks.
  await prisma.portalRequest.create({
    data: {
      id,
      customerId: customer.id,
      kind: 'order',
      status,
      source: 'sap',
      items: JSON.parse(JSON.stringify(items)),
      notes: '',
      priceBasis: items.length ? 'actual' : null,
      sapCompanyId: order.companyId,
      sapDocEntry: order.docEntry,
      sapDocNum: order.docNum,
      sapDocStatus: order.docStatus?.trim() ?? null,
      sapCanceled: order.canceled?.trim() ?? null,
      sapSyncedAt: new Date(),
    },
  })

  // The reference goes back onto the SAP document row, so a later sync of the same
  // ORDR keeps pointing at this portal order instead of producing a second one.
  await prisma.salesOrder.update({ where: { id: order.id }, data: { portalRef: id } })

  // The timeline opens by saying where the order came from. Without it the first
  // thing in the conversation is a status change, which reads as though the
  // order had always been here and the customer had been ignoring it.
  const openingNote = missingLines
    ? `Pesanan ini dibuat dari dokumen sistem ${order.docNum}. Baris item belum tersedia karena data detail belum tersinkron, jadi daftar produknya masih kosong; yang tercatat di sini adalah header dokumen. Statusnya mengikuti sistem secara otomatis.`
    : `Pesanan ini dibuat dari dokumen sistem ${order.docNum}. Statusnya mengikuti sistem secara otomatis.`

  await prisma.followUpNote.create({
    data: {
      requestId: id,
      authorId: null,
      authorName: 'Portal',
      authorRole: 'system',
      source: 'system',
      visibility: 'customer',
      message: openingNote,
    },
  })

  // Staff act on item detail, so they are told directly rather than left to find
  // an empty order in the list and wonder.
  if (missingLines) {
    const staffAudience = [
      ...(await staffRecipientsFor({ SlpCode: customer.SlpCode })).map((user) => user.id),
      ...(await adminRecipients()).map((user) => user.id),
    ]
    if (staffAudience.length) {
      const notices = await prisma.notification.createManyAndReturn({
        data: staffAudience.map((userId) => ({
          userId,
          title: `Dokumen ${order.docNum} masuk tanpa baris item`,
          message: `Pesanan ${id} untuk ${customer.CardName ?? customer.CardCode} diimpor dari sistem, tetapi data detail item belum tersinkron sehingga produknya belum tampil. Isi baris order agar pesanan tampil lengkap.`,
          type: 'sap_import',
          relatedId: id,
          kind: 'order',
        })),
      })
      for (const notice of notices) ws.emitNotificationCreated(notice)
    }
  }

  const customerUser = await customerRecipientFor(customer.id)
  const staff = await staffRecipientsFor({ SlpCode: customer.SlpCode })
  const admins = await adminRecipients()
  const targets = [
    ...(customerUser ? [customerUser.id] : []),
    ...staff.map((user) => user.id),
    ...admins.map((user) => user.id),
  ]
  if (targets.length) {
    const notifications = await prisma.notification.createManyAndReturn({
      data: targets.map((userId) => ({
        userId,
        title: `Pesanan ${id} dari dokumen sistem ${order.docNum}`,
        message: `Dokumen ${order.docNum} (${customer.CardName ?? customer.CardCode}) kini dapat diikuti di portal. Statusnya mengikuti sistem secara otomatis.`,
        type: 'sap_import',
        relatedId: id,
        kind: 'order',
      })),
    })
    for (const notification of notifications) ws.emitNotificationCreated(notification)
  }

  return {
    ok: true,
    message: missingLines
      ? `Dokumen ${order.docNum} diimpor sebagai ${id}, tanpa baris item: data detail belum tersinkron.`
      : `Dokumen ${order.docNum} diimpor sebagai ${id}.`,
    portalId: id,
    docNum: order.docNum,
    status,
    lines: items.length,
  }
}
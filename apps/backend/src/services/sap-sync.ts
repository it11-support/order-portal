import { prisma } from '@/utils'
import { ws } from '@/services/websocket'
import { customerRecipientFor, staffRecipientsFor } from '@/services/audience'
/**
 * Portal status versus SAP status.
 *
 * Once a portal order has become an ORDR, SAP owns the truth about it: the
 * document tells us whether it is still open, already delivered or canceled. The
 * portal therefore mirrors SAP instead of guessing, and staff are told when the
 * two disagree rather than being left to reconcile by hand.
 *
 * The sync job writes sales_orders; this service is what turns that into a
 * portal status, a timeline note and a notification. It runs on read, so a
 * portal that is never touched still converges the next time anyone looks.
 */
const sapOrderKey = (companyId: string, docEntry: number): string =>
  JSON.stringify([companyId, docEntry])
export interface SapOrderRow {
  companyId: string
  docEntry: number
  docNum: number
  docStatus: string | null
  canceled: string | null
  /** When the document itself last changed, as the source reported it. */
  sapUpdatedAt?: Date | null
  portalRef?: string | null
  remarks?: string | null
}
/**
 * How a portal order says its name inside SAP.
 *
 * The sync copies this into the order remarks when it creates the SO, which is
 * how the document finds its way back to the portal without anybody typing a
 * document number twice. It is a marked bracket rather than a bare id because the
 * remarks also hold whatever the office typed: "SISA SO:626092624 (KIRIM
 * PARTIAL) [PORTAL:ORD-xxxx]".
 *
 * Written here so the format has one definition. The sync reads the same shape.
 */
export const PORTAL_REF_MARKER = '[PORTAL:'
export const portalRefMarker = (portalRequestId: string) =>
  `${PORTAL_REF_MARKER}${portalRequestId}]`
const PORTAL_REF_PATTERN = /\[PORTAL:([A-Za-z0-9._:-]{1,64})\]/
/**
 * The portal order id carried in a document's remarks, if any.
 *
 * Remarks are edited by hand in SAP, so this tolerates anything around the
 * marker and refuses anything that cannot be a portal id rather than linking an
 * order to a document because of a stray bracket.
 */
export const portalRefFromRemarks = (remarks: string | null | undefined): string | null => {
  if (!remarks) return null
  const match = PORTAL_REF_PATTERN.exec(remarks)
  return match ? match[1] : null
}
export interface SapStatusView {
  companyId: string
  docEntry: number
  docNum: number
  /** open = O, closed = C. */
  docStatus: 'open' | 'closed' | 'unknown'
  canceled: boolean
  syncedAt: string
  /** The portal status after mirroring, which may have moved during reconcile. */
  portalStatus?: string
  [key: string]: unknown
}
/**
 * The portal status a SAP document implies.
 *
 * Delivery is decided by the invoices, not by the order header: the customer is
 * told "delivered" when there is a delivery document behind it, not when SAP has
 * closed a form. An order closed without any synced invoice is left where it is,
 * because marking it delivered on the strength of a header alone would tell the
 * customer something nobody has delivered yet.
 *
 * An open SAP document never pulls a finished portal order backwards, because
 * "delivered" here may have been set by staff who know something SAP has not been
 * told yet.
 */
export const portalStatusFromSap = (
  row: { docStatus: string | null; canceled: string | null },
  current: string,
  coverage?: DeliveryCoverage | null,
): string | null => {
  const canceled = (row.canceled ?? 'N').trim().toUpperCase() === 'Y'
  if (canceled) return 'cancelled'
  const docStatus = (row.docStatus ?? '').trim().toUpperCase()
  // Lines are known: the invoices say how much of the order actually went out.
  if (coverage && coverage.orderedValue > 0) {
    // Nothing invoiced yet means nothing to announce, closed header or not.
    if (coverage.invoicedValue <= 0) return null
    if (coverage.invoicedValue >= coverage.orderedValue) return 'delivered'
    return 'processing'
  }
  // No lines to compare against: the header is all there is, so a closed
  // document is the only thing that can claim anything.
  if (docStatus === 'C') return 'delivered'
  return null
}
/**
 * How much of an order the invoices account for.
 *
 * Compared by value, not by quantity: an invoice line carries quantities in the
 * inventory unit while the order carries them in the selling unit, so the two
 * numbers are not the same measure even when they look alike.
 *
 * The invoice documents themselves are carried along, because "something was
 * invoiced" is only half an answer: the number is what a customer reads to match
 * the update against the paperwork they were sent.
 */
export interface DeliveryCoverage {
  orderedValue: number
  invoicedValue: number
  invoices: number
  /** Document numbers of the invoices counted above, newest last. */
  invoiceDocs: number[]
}
const view = (row: SapOrderRow): SapStatusView => ({
  companyId: row.companyId,
  docEntry: row.docEntry,
  docNum: row.docNum,
  docStatus:
    (row.docStatus ?? '').trim().toUpperCase() === 'C'
      ? 'closed'
      : (row.docStatus ?? '').trim().toUpperCase() === 'O'
        ? 'open'
        : 'unknown',
  canceled: (row.canceled ?? 'N').trim().toUpperCase() === 'Y',
  syncedAt: new Date().toISOString(),
})
/** The portal status as a customer reads it, rather than as the database stores it. */
const label = (status: string) =>
  ({
    pending: 'Menunggu konfirmasi',
    confirmed: 'Dikonfirmasi',
    processing: 'Diproses',
    delivered: 'Selesai',
    cancelled: 'Dibatalkan',
  })[status] ?? status
/**
 * When the document last changed, in the words the note uses.
 *
 * The note is the only place the customer is told *why* a status moved, so it has
 * to say what moved and when the source says it moved. Without the timestamp a
 * note that arrives in the middle of the night is indistinguishable from one
 * written by a person, which is exactly the update somebody would otherwise have
 * to ask about.
 */
const updatedInSystem = (row: SapOrderRow): string | null => {
  if (!row.sapUpdatedAt) return null
  const stamp = new Date(row.sapUpdatedAt).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `diperbarui di sistem ${stamp}`
}
/**
 * The invoice clause, when there is one to state.
 *
 * Named rather than counted: "2 invoice" tells a customer nothing they can act
 * on, while the document number is what they would quote when asking about the
 * delivery. A long order is invoiced in several documents, so the list is capped
 * and the rest are counted rather than dropped.
 */
const invoiceClause = (coverage?: DeliveryCoverage | null): string | null => {
  if (!coverage || !coverage.invoices) return null
  const docs = [...new Set(coverage.invoiceDocs)].sort((a, b) => a - b)
  if (!docs.length) return null
  const shown = docs.slice(0, 3).join(', ')
  const rest = docs.length - 3
  return rest > 0 ? `Invoice ${shown}, dan ${rest} invoice lainnya.` : `Invoice ${shown}.`
}
interface RequestRow {
  id: string
  kind: string
  status: string
  customerId: bigint | string
  sapCompanyId: string | null
  sapDocEntry: number | null
  customer: {
    CardCode: string | null
    CardName: string | null
    CntctPrsn: string | null
    SlpCode: number | null
  }
}
/**
 * Mirrors one SAP document onto its portal request.
 *
 * Idempotent: an unchanged SAP status writes nothing, sends nothing and returns
 * the current view. A change appends a timeline note and notifies the customer
 * and the responsible staff, because a delivery moving on its own is exactly
 * the kind of update that must not require a refresh to notice.
 */
export const reconcileRequest = async (
  request: RequestRow,
  row: SapOrderRow,
  coverage?: DeliveryCoverage | null,
): Promise<{ view: SapStatusView; changed: boolean; status: string }> => {
  // Never overwrite an existing SAP link with a different document.
  if (request.sapDocEntry !== null && request.sapCompanyId !== null &&
    (request.sapDocEntry !== row.docEntry || request.sapCompanyId !== row.companyId)) {
    throw new Error(`SAP link mismatch for portal request ${request.id}`)
  }
  const next = portalStatusFromSap(row, request.status, coverage)
  const firstLink = request.sapDocEntry !== row.docEntry || request.sapCompanyId !== row.companyId
  await prisma.portalRequest.update({
    where: { id: request.id },
    data: {
      sapCompanyId: row.companyId,
      sapDocEntry: row.docEntry,
      sapDocNum: row.docNum,
      sapDocStatus: row.docStatus?.trim() ?? null,
      sapCanceled: row.canceled?.trim() ?? null,
      sapSyncedAt: new Date(),
    },
  })
  // Either SAP implies no step of its own, or the portal is already there. Only
  // the first link is news, and it is news about the link, not the status.
  if (next === null || next === request.status) {
    if (firstLink) {
      await systemNote(request.id, linkNote(row, coverage))
      ws.emitOrderSapSynced(request.id, String(request.customerId), view(row))
    }
    return {
      view: { ...view(row), portalStatus: request.status },
      changed: false,
      status: request.status,
    }
  }
  const updated = await prisma.portalRequest.updateMany({
    where: { id: request.id, status: request.status },
    data: { status: next },
  })
  if (updated.count !== 1)
    return {
      view: { ...view(row), portalStatus: request.status },
      changed: false,
      status: request.status,
    }
  // What moved, when the source says it moved, and which invoice carries it.
  // The three belong in one sentence: the status alone says the portal reacted,
  // the timestamp says it reacted to a real document change, and the invoice
  // number is what the customer can quote when they ask about the delivery.
  const stamp = updatedInSystem(row)
  const invoice = invoiceClause(coverage)
  const message =
    `Status pesanan: ${label(request.status)} → ${label(next)}. ` +
    `Dokumen ${row.docNum}${stamp ? ` ${stamp}` : ''}.` +
    (invoice ? ` ${invoice}` : '')
  await systemNote(request.id, message)
  const customerUser = await customerRecipientFor(request.customerId)
  const staffRecipients = await staffRecipientsFor({ SlpCode: request.customer.SlpCode })
  const targets = [
    ...(customerUser ? [customerUser.id] : []),
    ...staffRecipients.map((user) => user.id),
  ]
  if (targets.length) {
    const notifications = await prisma.notification.createManyAndReturn({
      data: targets.map((userId) => ({
        userId,
        title: `Status pesanan ${request.id} diperbarui dari sistem`,
        message,
        type: 'status_update',
        relatedId: request.id,
        kind: request.kind,
      })),
    })
    for (const notification of notifications) ws.emitNotificationCreated(notification)
  }
  ws.emitOrderStatusChanged(
    request.id,
    String(request.customerId),
    request.status,
    next,
    request.kind as 'order' | 'quote',
  )
  ws.emitOrderSapSynced(request.id, String(request.customerId), {
    ...view(row),
    portalStatus: next,
  })
  return { view: { ...view(row), portalStatus: next }, changed: true, status: next }
}
const systemNote = async (requestId: string, message: string) => {
  return prisma.followUpNote.create({
    data: {
      requestId,
      authorId: null,
      authorName: 'Portal',
      authorRole: 'system',
      source: 'system',
      visibility: 'customer',
      message,
    },
  })
}
/** What the invoices say about this document, in one clause or none. */
const linkNote = (row: SapOrderRow, coverage?: DeliveryCoverage | null) => {
  const open =
    row.docStatus?.trim() === 'O' ? 'Open' : row.docStatus?.trim() === 'C' ? 'Closed' : 'Open'
  const stamp = updatedInSystem(row)
  return (
    `Dokumen ${row.docNum} terhubung ke pesanan ini (${open}` +
    `${stamp ? `, ${stamp}` : ''}${invoiceClause(coverage) ? `. ${invoiceClause(coverage)}` : ''}).`
  )
}
/**
 * How much of each SAP document has been invoiced.
 *
 * BaseType 17 is a sales order, so an invoice line with that base type and this
 * document's DocEntry is a delivery of it. Canceled invoice lines are not
 * deliveries. Ordered value comes from the order's own lines; when there are none,
 * the coverage is left empty and the caller falls back to the document header.
 */
export const deliveryCoverage = async (
  documents: Array<{ companyId: string; docEntry: number }>,
): Promise<Map<string, DeliveryCoverage>> => {
  const coverage = new Map<string, DeliveryCoverage>()
  if (!documents.length) return coverage
  const orders = await prisma.salesOrder.findMany({
    where: {
      OR: documents.map(({ companyId, docEntry }) => ({ companyId, docEntry })),
    },
    select: { id: true, companyId: true, docEntry: true },
  })
  if (!orders.length) return coverage
  const [ordered, invoiced] = await Promise.all([
    prisma.salesOrderLine.groupBy({
      by: ['salesOrderId'],
      where: { salesOrderId: { in: orders.map((row) => row.id) } },
      _sum: { lineTotal: true },
    }),
    prisma.salesInvoice.groupBy({
      by: ['companyId', 'baseEntry', 'docNum'],
      where: {
        OR: orders.map(({ companyId, docEntry }) => ({
          companyId,
          baseEntry: docEntry,
        })),
        baseType: 17,
        canceled: { not: 'Y' },
      },
      _sum: { lineTotal: true },
    }),
  ])
  const orderedValues = new Map(
    ordered.map((row) => [row.salesOrderId, Number(row._sum.lineTotal ?? 0)]),
  )
  const invoiceValues = new Map<string, { value: number; docs: Set<number> }>()
  for (const row of invoiced) {
    if (row.baseEntry === null) continue
    const key = sapOrderKey(row.companyId, row.baseEntry)
    const current = invoiceValues.get(key) ?? { value: 0, docs: new Set<number>() }
    current.value += Number(row._sum.lineTotal ?? 0)
    current.docs.add(row.docNum)
    invoiceValues.set(key, current)
  }
  for (const order of orders) {
    const key = sapOrderKey(order.companyId, order.docEntry)
    const invoice = invoiceValues.get(key)
    const invoiceDocs = invoice ? [...invoice.docs].sort((a, b) => a - b) : []
    coverage.set(key, {
      orderedValue: orderedValues.get(order.id) ?? 0,
      invoicedValue: invoice?.value ?? 0,
      invoices: invoiceDocs.length,
      invoiceDocs,
    })
  }
  return coverage
}
/**
 * Brings a set of portal requests up to date with SAP.
 *
 * Three lookups regardless of batch size: the documents they are already linked
 * to, the documents that name them, and what has been invoiced against those
 * documents. The list page calls this on every read, so it must stay cheap and
 * must never throw into the request.
 */
export const reconcileRequests = async (
  requests: RequestRow[],
): Promise<Map<string, SapStatusView>> => {
  const views = new Map<string, SapStatusView>()
  if (!requests.length) return views
  try {
    const linked = requests.filter(
      (request) => request.sapDocEntry !== null && request.sapCompanyId !== null,
    )
    const documents = await prisma.salesOrder.findMany({
      where: {
        OR: [
          ...linked.map((request) => ({
            companyId: request.sapCompanyId!,
            docEntry: request.sapDocEntry!,
          })),
          { portalRef: { in: requests.map((request) => request.id) } },
        ],
      },
      select: {
        companyId: true,
        docEntry: true,
        docNum: true,
        docStatus: true,
        canceled: true,
        sapUpdatedAt: true,
        portalRef: true,
        remarks: true,
      },
    })
    const byDocEntry = new Map(
      documents.map((row) => [
        sapOrderKey(row.companyId, row.docEntry),
        row,
      ]),
    )
    const byPortalRef = new Map<string, (typeof documents)[number]>()
    const requested = new Map(requests.map((request) => [request.id, request]))
    const registerRef = (ref: string, row: (typeof documents)[number]): boolean => {
      const request = requested.get(ref)
      if (!request) return false
      if (request.sapCompanyId !== null && request.sapDocEntry !== null &&
        (request.sapCompanyId !== row.companyId || request.sapDocEntry !== row.docEntry)) {
        return false
      }
      const existing = byPortalRef.get(ref)
      if (existing && sapOrderKey(existing.companyId, existing.docEntry) !==
        sapOrderKey(row.companyId, row.docEntry)) {
        // Ambiguous reference: refuse to choose either SAP document.
        byPortalRef.delete(ref)
        return false
      }
      byPortalRef.set(ref, row)
      return true
    }
    for (const row of documents) {
      if (row.portalRef) registerRef(row.portalRef, row)
    }
    // A document that has not named its portal order can still be recognised: the
    // sync copies the reference into the SAP remarks, and the id can be read out
    // of it here.
    for (const row of documents) {
      if (row.portalRef) continue
      const adopted = portalRefFromRemarks(row.remarks)
      if (adopted) {
        if (!registerRef(adopted, { ...row, portalRef: adopted })) continue
        const updated = await prisma.salesOrder.updateMany({
          where: { companyId: row.companyId, docEntry: row.docEntry, portalRef: null },
          data: { portalRef: adopted },
        }).catch(() => ({ count: 0 }))
        if (updated.count !== 1) byPortalRef.delete(adopted)
      }
    }
    const coverage = await deliveryCoverage(documents.map((row) => ({
      companyId: row.companyId,
      docEntry: row.docEntry,
    })))
    for (const request of requests) {
      const row =
        (request.sapCompanyId !== null && request.sapDocEntry !== null
          ? byDocEntry.get(sapOrderKey(request.sapCompanyId, request.sapDocEntry))
          : undefined) ?? byPortalRef.get(request.id)
      if (!row || (row.portalRef && row.portalRef !== request.id)) continue
      if (request.sapCompanyId !== null && request.sapDocEntry !== null &&
        (request.sapCompanyId !== row.companyId || request.sapDocEntry !== row.docEntry)) continue
      const result = await reconcileRequest(request, row, coverage.get(sapOrderKey(row.companyId, row.docEntry)) ?? null)
      views.set(request.id, result.view)
    }
  } catch {
    // A sync hiccup must not take the orders list down with it: the portal keeps
    // showing its own status and the next read tries again.
  }
  return views
}
/**
 * Links a portal order to its SAP document on request from admin.
 *
 * SAP may not have the document yet when admin confirms the upload, so a
 * missing document is not an error: the link is stored and the status is
 * filled in by the next reconcile.
 */
export const linkSapDocument = async (
  request: RequestRow,
  input: { docEntry: number; companyId?: string | null },
): Promise<{ linked: boolean; view: SapStatusView | null; message?: string }> => {
  const candidates = await prisma.salesOrder.findMany({
    where: {
      docEntry: input.docEntry,
      ...((input.companyId ?? request.sapCompanyId)
        ? { companyId: (input.companyId ?? request.sapCompanyId)! }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 2,
    select: {
      companyId: true,
      docEntry: true,
      docNum: true,
      docStatus: true,
      canceled: true,
      sapUpdatedAt: true,
      portalRef: true,
    },
  })
  if (!input.companyId && !request.sapCompanyId && candidates.length > 1) {
    return {
      linked: false,
      view: null,
      message: 'DocEntry ditemukan di beberapa company. Pilih company SAP terlebih dahulu.',
    }
  }
  const row = candidates[0]
  if (!row) {
    await prisma.portalRequest.update({
      where: { id: request.id },
      data: {
        sapCompanyId: input.companyId ?? request.sapCompanyId,
        sapDocEntry: input.docEntry,
      },
    })
    return {
      linked: true,
      view: null,
      message:
        'Dokumen belum ada di data sinkron. Status akan otomatis mengikuti begitu dokumen masuk.',
    }
  }
  if (row.portalRef && row.portalRef !== request.id) {
    return {
      linked: false,
      view: null,
      message: `Dokumen ${row.docNum} sudah terhubung ke permintaan lain (${row.portalRef}).`,
    }
  }
  // Claim only this company's document, and never overwrite another portal reference.
  try {
    const claimed = await prisma.salesOrder.updateMany({
      where: { companyId: row.companyId, docEntry: row.docEntry, portalRef: null },
      data: { portalRef: request.id },
    })
    if (claimed.count === 0) {
      const current = await prisma.salesOrder.findUnique({
        where: { companyId_docEntry: { companyId: row.companyId, docEntry: row.docEntry } },
        select: { portalRef: true },
      })
      if (current?.portalRef !== request.id) {
        return { linked: false, view: null, message: 'Dokumen SAP sudah terhubung ke permintaan lain.' }
      }
    }
  } catch {
    const owner = await prisma.salesOrder.findFirst({
      where: { portalRef: request.id, NOT: { companyId: row.companyId, docEntry: row.docEntry } },
      select: { docNum: true },
    })
    if (owner) {
      return {
        linked: false,
        view: null,
        message: `Permintaan ini sudah terhubung ke dokumen ${owner.docNum}. Satu pesanan portal hanya boleh punya satu dokumen sistem.`,
      }
    }
    throw new Error('Gagal menautkan dokumen sistem.')
  }
  const coverage = await deliveryCoverage([{ companyId: row.companyId, docEntry: row.docEntry }])
  const result = await reconcileRequest(request, row, coverage.get(sapOrderKey(row.companyId, row.docEntry)) ?? null)
  return {
    linked: true,
    view: result.view,
    message: result.changed
      ? `Dokumen ${row.docNum} ditemukan dan status disinkronkan.`
      : `Dokumen ${row.docNum} terhubung.`,
  }
}

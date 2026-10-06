import { prisma } from '@/utils'
import { getRequest } from '@/controllers/requests'
import { importSapOrder } from '@/services/sap-import'
import { deliveryCoverage } from '@/services/sap-sync'

/**
 * A SAP order that only lives in SAP is invisible to the customer.
 *
 * This covers the import that gives it a portal request, and then the part that
 * matters afterwards: when the sync updates the ORDR, the portal order follows on
 * its own - status, timeline and notification - with nobody touching it in the UI.
 */

const assert = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

const makeRes = (): any => {
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(body: any) {
      res.body = body
      return res
    },
    setHeader: () => res,
  }
  return res
}

const adminUser = (id: number) => ({
  id,
  name: 'Administrator',
  username: 'admin',
  role: { name: 'admin' },
  customerId: null,
  slpCode: null,
})

const customerUser = (id: number, customerId: bigint, username: string) => ({
  id,
  name: username,
  username,
  role: { name: 'customer' },
  customerId,
  slpCode: null,
})

const reqFor = (user: any, params: Record<string, string> = {}) =>
  ({ params, query: {}, body: {}, user }) as any

const companyId = 'SMOKE_SAP_IMPORT_CO'
const docEntry = 970001
const docNum = 9701

const main = async () => {
  const admin = await prisma.user.findFirstOrThrow({
    where: { role: { name: 'admin' }, isActive: true },
    select: { id: true },
  })
  const portalUser = await prisma.user.findFirstOrThrow({
    where: { role: { name: 'customer' }, isActive: true, customerId: { not: null } },
    orderBy: { id: 'asc' },
    select: { id: true, customerId: true, username: true, name: true },
  })
  const customerId = BigInt(String(portalUser.customerId))
  const customer = await prisma.customers.findUniqueOrThrow({
    where: { id: customerId },
    select: { CardCode: true, CardName: true },
  })
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { id: 'asc' },
    take: 2,
    select: { id: true, itemCode: true, itemName: true },
  })

  // The document as the sync would have written it: open, with lines.
  const salesOrder = await prisma.salesOrder.create({
    data: {
      companyId,
      docEntry,
      docNum,
      docDate: new Date('2026-09-20T00:00:00Z'),
      cardCode: customer.CardCode ?? 'C001',
      cardName: customer.CardName,
      docStatus: 'O',
      canceled: 'N',
      currency: 'IDR',
      docTotal: 3_250_000,
      lines: {
        create: products.map((product, index) => ({
          lineNum: (index + 1) * 10,
          itemCode: product.itemCode,
          description: product.itemName,
          quantity: index === 0 ? 2 : 1,
          openQty: index === 0 ? 2 : 1,
          price: index === 0 ? 1_250_000 : 750_000,
          lineTotal: index === 0 ? 2_500_000 : 750_000,
          lineStatus: 'O',
        })),
      },
    },
  })

  const portalId = `ORD-DOC-${docNum}`
  // Ids registered while the run is in progress, so a throw halfway through still
  // leaves nothing behind in the customer's own order list.
  const cleanupIds = [portalId]
  const cleanupEntries = [docEntry]
  const cleanupInvoices: number[] = []
  const cleanup = async () => {
    await prisma.portalRequest.deleteMany({ where: { id: { in: cleanupIds } } })
    await prisma.followUpNote.deleteMany({ where: { requestId: { in: cleanupIds } } })
    await prisma.notification.deleteMany({ where: { relatedId: { in: cleanupIds } } })
    await prisma.salesOrder.deleteMany({ where: { docEntry: { in: cleanupEntries } } })
    await prisma.salesInvoice.deleteMany({ where: { docEntry: { in: cleanupInvoices } } })
  }

  try {
    console.log('--- importing the SAP order into the portal ---')
    const imported = await importSapOrder({ docEntry })
    assert('the import succeeds', imported.ok, true)
    assert('the portal request is named after the document', imported.portalId, portalId)

    const row = await prisma.portalRequest.findUniqueOrThrow({ where: { id: portalId } })
    assert('it is an order', row.kind, 'order')
    assert('it is marked as coming from SAP', row.source, 'sap')
    assert('an open document starts at confirmed', row.status, 'confirmed')
    assert('the document is linked', row.sapDocEntry, docEntry)
    assert('the lines were carried over', Array.isArray(row.items) ? (row.items as unknown[]).length : 0, products.length)

    const items = row.items as any[]
    assert(
      'each line keeps its SAP price',
      items.every((item) => typeof item.price === 'number' && item.price > 0),
      true,
    )
    assert(
      'a catalog item is matched to the product',
      items.some((item) => item.product?.itemCode === products[0].itemCode),
      true,
    )

    const linked = await prisma.salesOrder.findUniqueOrThrow({
      where: { id: salesOrder.id },
      select: { portalRef: true },
    })
    assert('the document points back at the portal order', linked.portalRef, portalId)

    console.log('\n--- importing twice does not duplicate the order ---')
    const again = await importSapOrder({ docEntry })
    assert('the second import is a no-op', again.message.includes('sudah diimpor'), true)
    assert(
      'only one portal request exists',
      await prisma.portalRequest.count({ where: { id: portalId } }),
      1,
    )

    console.log('\n--- SAP closes the document but nothing is invoiced ---')
    await prisma.salesOrder.update({
      where: { id: salesOrder.id },
      data: { docStatus: 'C', sapUpdatedAt: new Date() },
    })

    let res = makeRes()
    await getRequest(reqFor(customerUser(portalUser.id, customerId, portalUser.username), { id: portalId }), res)
    assert('the customer can read the order', res.statusCode, 200)
    assert('a closed header alone does not deliver', res.body.data.status, 'confirmed')
    assert('the SAP badge reads closed', res.body.data.sap.docStatus, 'closed')

    console.log('\n--- the sync delivers part of it ---')
    const coverage = await deliveryCoverage([docEntry])
    assert('the order value is what is being compared', coverage.get(docEntry)?.orderedValue, 3250000)
    assert('nothing is invoiced yet', coverage.get(docEntry)?.invoicedValue, 0)

    // Half the value: 1.5m of the 3.25m order.
    await prisma.salesInvoice.create({
      data: {
        companyId,
        docEntry: docEntry + 200,
        docNum: docNum + 200,
        lineNum: 0,
        docDate: new Date('2026-10-01T00:00:00Z'),
        cardCode: customer.CardCode ?? 'C001',
        itemCode: products[0].itemCode,
        description: products[0].itemName,
        quantity: 1,
        inventoryQuantity: 1,
        lineTotal: 1500000,
        currency: 'IDR',
        canceled: 'N',
        baseType: 17,
        baseEntry: docEntry,
      },
    })
    cleanupInvoices.push(docEntry + 200)

    res = makeRes()
    await getRequest(reqFor(customerUser(portalUser.id, customerId, portalUser.username), { id: portalId }), res)
    assert('a part delivery is processing, not delivered', res.body.data.status, 'processing')

    console.log('\n--- the rest is invoiced ---')
    await prisma.salesInvoice.create({
      data: {
        companyId,
        docEntry: docEntry + 201,
        docNum: docNum + 201,
        lineNum: 0,
        docDate: new Date('2026-10-02T00:00:00Z'),
        cardCode: customer.CardCode ?? 'C001',
        itemCode: products[0].itemCode,
        description: products[0].itemName,
        quantity: 2,
        inventoryQuantity: 2,
        lineTotal: 1750000,
        currency: 'IDR',
        canceled: 'N',
        baseType: 17,
        baseEntry: docEntry,
      },
    })
    cleanupInvoices.push(docEntry + 201)

    res = makeRes()
    await getRequest(reqFor(customerUser(portalUser.id, customerId, portalUser.username), { id: portalId }), res)
    assert('the portal status followed SAP', res.body.data.status, 'delivered')

    const notes = await prisma.followUpNote.findMany({
      where: { requestId: portalId },
      orderBy: { createdAt: 'asc' },
      select: { authorRole: true, message: true },
    })
    assert(
      'the timeline explains the move',
      notes.some((note) => note.message.includes('Status pesanan:')),
      true,
    )
    assert('the timeline is written by the system, not by a person', notes.every((note) => note.authorRole === 'system'), true)

    const notified = await prisma.notification.findFirst({
      where: { relatedId: portalId, userId: portalUser.id, type: 'status_update' },
      select: { id: true },
    })
    assert('the customer was told without anyone acting', notified !== null, true)

    console.log('\n--- a canceled document cancels the portal order ---')
    await prisma.salesOrder.update({
      where: { id: salesOrder.id },
      data: { canceled: 'Y' },
    })
    res = makeRes()
    await getRequest(reqFor(adminUser(admin.id), { id: portalId }), res)
    assert('the portal status followed SAP again', res.body.data.status, 'cancelled')

    console.log('\n--- an order whose RDR1 has not synced yet ---')
    // The header exists but its lines do not. The order happened in SAP, so it is
    // published - with the missing lines stated, rather than as a silent empty
    // order that reads as "the customer ordered nothing".
    const headerOnly = await prisma.salesOrder.create({
      data: {
        companyId,
        docEntry: docEntry + 1,
        docNum: docNum + 1,
        docDate: new Date('2026-10-02T00:00:00Z'),
        cardCode: customer.CardCode ?? 'C001',
        cardName: customer.CardName,
        docStatus: 'O',
        canceled: 'N',
        currency: 'IDR',
        docTotal: 750000,
        remarks: 'HEADER SAJA',
      },
    })
    const headerPortalId = `ORD-DOC-${docNum + 1}`
    cleanupIds.push(headerPortalId)
    cleanupEntries.push(headerOnly.docEntry)

    const headerImport = await importSapOrder({ docEntry: headerOnly.docEntry })
    assert('the header is still imported', headerImport.ok, true)
    assert('the gap is named in the result', headerImport.message.includes('data detail belum tersinkron'), true)

    const headerRow = await prisma.portalRequest.findUniqueOrThrow({
      where: { id: headerPortalId },
      select: { items: true, priceBasis: true, notes: true },
    })
    assert('it has no items, because there are none', Array.isArray(headerRow.items) ? (headerRow.items as unknown[]).length : -1, 0)
    assert('no price basis is claimed without prices', headerRow.priceBasis, null)
    assert('the customer note is left empty for the customer to write', headerRow.notes, '')

    const headerNotes = await prisma.followUpNote.findMany({
      where: { requestId: headerPortalId },
      select: { message: true },
    })
    assert('the timeline opens by saying where the order came from', headerNotes.some((note) => note.message.startsWith('Pesanan ini dibuat dari dokumen sistem')), true)
    assert(
      'and it says plainly that the lines are missing',
      headerNotes.some((note) => note.message.includes('data detail belum tersinkron')),
      true,
    )

    const staffHeadsUp = await prisma.notification.count({
      where: { relatedId: headerPortalId, type: 'sap_import', title: { contains: 'tanpa baris item' } },
    })
    assert('staff are warned separately', staffHeadsUp > 0, true)
  } finally {
    await cleanup()
    console.log('\nfixture removed')
  }

  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
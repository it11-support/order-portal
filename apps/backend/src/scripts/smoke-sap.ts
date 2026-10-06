import { prisma } from '@/utils'
import { linkRequestToSap, listRequests } from '@/controllers/requests'
import {
  deliveryCoverage,
  portalRefFromRemarks,
  portalRefMarker,
  portalStatusFromSap,
  reconcileRequests,
} from '@/services/sap-sync'

/**
 * Verifies that a portal order follows its document.
 *
 * The document owns the truth once it exists: closed means delivered, canceled
 * means canceled, and an open document never pulls a finished order backwards.
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

const companyId = 'SMOKE_SAP_CO'
const docEntry = 99500001

const main = async () => {
  console.log('--- status mapping without invoice data ---')
  assert('closed document means delivered', portalStatusFromSap({ docStatus: 'C', canceled: 'N' }, 'processing'), 'delivered')
  assert('canceled document means cancelled', portalStatusFromSap({ docStatus: 'C', canceled: 'Y' }, 'processing'), 'cancelled')
  assert('open document claims no step of its own', portalStatusFromSap({ docStatus: 'O', canceled: 'N' }, 'processing'), null)
  assert(
    'an open document does not resurrect a delivered order',
    portalStatusFromSap({ docStatus: 'O', canceled: 'N' }, 'delivered'),
    null,
  )
  assert('char padding is trimmed', portalStatusFromSap({ docStatus: 'C ', canceled: 'N ' }, 'processing'), 'delivered')

  console.log('\n--- status mapping from the invoices ---')
  const half = { orderedValue: 1000, invoicedValue: 400, invoices: 1, invoiceDocs: [326190001] }
  const all = { orderedValue: 1000, invoicedValue: 1000, invoices: 1, invoiceDocs: [326190001] }
  const none = { orderedValue: 1000, invoicedValue: 0, invoices: 0, invoiceDocs: [] }
  assert('a part delivery is processing', portalStatusFromSap({ docStatus: 'O', canceled: 'N' }, 'confirmed', half), 'processing')
  assert('a full delivery is delivered', portalStatusFromSap({ docStatus: 'O', canceled: 'N' }, 'processing', all), 'delivered')
  assert('nothing invoiced means no move', portalStatusFromSap({ docStatus: 'O', canceled: 'N' }, 'confirmed', none), null)
  assert(
    'a closed header with no invoice does not deliver',
    portalStatusFromSap({ docStatus: 'C', canceled: 'N' }, 'confirmed', none),
    null,
  )
  assert(
    'a canceled document wins over any coverage',
    portalStatusFromSap({ docStatus: 'O', canceled: 'Y' }, 'processing', half),
    'cancelled',
  )

  console.log('\n--- the portal reference carried in SAP remarks ---')
  assert('a marked reference is read out', portalRefFromRemarks('SISA SO:626092624 (KIRIM PARTIAL) [PORTAL:ORD-abc-123]'), 'ORD-abc-123')
  assert('remarks without the marker link nothing', portalRefFromRemarks('SISA SO:626092624'), null)
  assert('empty remarks link nothing', portalRefFromRemarks(null), null)
  assert(
    'a stray bracket cannot invent an order',
    portalRefFromRemarks('[PORTAL: spaces and slashes /]'),
    null,
  )
  assert('the marker is written the same way it is read', portalRefMarker('ORD-xyz'), '[PORTAL:ORD-xyz]')

  const admin = await prisma.user.findFirstOrThrow({
    where: { role: { name: 'admin' }, isActive: true },
    select: { id: true },
  })
  const portalUser = await prisma.user.findFirstOrThrow({
    where: { role: { name: 'customer' }, isActive: true, customerId: { not: null } },
    orderBy: { id: 'asc' },
    select: { id: true, customerId: true },
  })
  const customerId = BigInt(String(portalUser.customerId))
  const customer = await prisma.customers.findUniqueOrThrow({
    where: { id: customerId },
    select: { CardCode: true },
  })
  const product = await prisma.product.findFirstOrThrow({
    where: { isActive: true },
    orderBy: { id: 'asc' },
    select: { itemCode: true },
  })

  const requestId = `ORD-DOC-${Date.now()}`
  // Declared with the other fixture ids so the cleanup below can remove it even
  // when an assertion throws between here and the end of the run.
  const otherId = `${requestId}-OTHER`
  await prisma.portalRequest.create({
    data: {
      id: requestId,
      customerId,
      kind: 'order',
      status: 'confirmed',
      notes: 'sap smoke fixture',
      items: [{ product: { itemCode: product.itemCode }, qty: 1 }],
    },
  })

  try {
    console.log('\n--- linking before the document is synced ---')
    let res = makeRes()
    await linkRequestToSap({ params: { id: requestId }, body: { docEntry }, user: adminUser(admin.id) } as any, res)
    assert('the link is accepted', res.statusCode, 200)
    assert('the document is reported as not synced yet', res.body.data.sap.docStatus, 'unknown')
    assert('the link form stays visible', res.body.data.sap.status, 'unknown')
    const pending = await prisma.portalRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: { sapDocEntry: true, status: true },
    })
    assert('the docEntry is remembered', pending.sapDocEntry, docEntry)
    assert('the status is untouched while there is no document', pending.status, 'confirmed')

    console.log('\n--- the sync delivers an open document ---')
    await prisma.salesOrder.create({
      data: {
        companyId,
        docEntry,
        docNum: 5001,
        docDate: new Date('2026-02-01T00:00:00Z'),
        cardCode: customer.CardCode ?? 'C001',
        docStatus: 'O',
        canceled: 'N',
        portalRef: requestId,
        lines: {
          create: [
            {
              lineNum: 0,
              itemCode: product.itemCode,
              description: 'smoke sap fixture',
              quantity: 10,
              openQty: 10,
              price: 100000,
              lineTotal: 1000000,
              lineStatus: 'O',
            },
          ],
        },
      },
    })
    res = makeRes()
    await listRequests({ user: adminUser(admin.id), params: {}, body: {}, query: {} } as any, res)
    const listed = res.body.data.find((row: any) => row.id === requestId)
    assert('the order is linked to the SAP document', listed.sap.docEntry, docEntry)
    assert('the SAP status is reported as open', listed.sap.status, 'open')
    assert('an open document leaves the portal status alone', listed.status, 'confirmed')

    console.log('\n--- the document closes in SAP but nothing is invoiced ---')
    await prisma.salesOrder.update({
      where: { companyId_docEntry: { companyId, docEntry } },
      data: { docStatus: 'C' },
    })
    res = makeRes()
    await listRequests({ user: adminUser(admin.id), params: {}, body: {}, query: {} } as any, res)
    const closedOnly = res.body.data.find((row: any) => row.id === requestId)
    assert('a closed header alone does not deliver', closedOnly.status, 'confirmed')
    assert('the SAP status is reported as closed', closedOnly.sap.status, 'closed')

    console.log('\n--- a partial invoice means processing, not delivered ---')
    await prisma.salesInvoice.create({
      data: {
        companyId,
        docEntry: docEntry + 100,
        docNum: 9001,
        lineNum: 0,
        docDate: new Date('2026-02-02T00:00:00Z'),
        cardCode: customer.CardCode ?? 'C001',
        itemCode: product.itemCode,
        description: 'smoke sap partial',
        quantity: 4,
        inventoryQuantity: 4,
        lineTotal: 400000,
        currency: 'IDR',
        canceled: 'N',
        baseType: 17,
        baseEntry: docEntry,
      },
    })
    res = makeRes()
    await listRequests({ user: adminUser(admin.id), params: {}, body: {}, query: {} } as any, res)
    const partial = res.body.data.find((row: any) => row.id === requestId)
    assert('a part delivery is processing', partial.status, 'processing')

    console.log('\n--- the invoice completes the order ---')
    await prisma.salesInvoice.create({
      data: {
        companyId,
        docEntry: docEntry + 101,
        docNum: 9002,
        lineNum: 0,
        docDate: new Date('2026-02-03T00:00:00Z'),
        cardCode: customer.CardCode ?? 'C001',
        itemCode: product.itemCode,
        description: 'smoke sap remainder',
        quantity: 6,
        inventoryQuantity: 6,
        lineTotal: 600000,
        currency: 'IDR',
        canceled: 'N',
        baseType: 17,
        baseEntry: docEntry,
      },
    })
    res = makeRes()
    await listRequests({ user: adminUser(admin.id), params: {}, body: {}, query: {} } as any, res)
    const closed = res.body.data.find((row: any) => row.id === requestId)
    assert('the portal follows SAP to delivered', closed.status, 'delivered')
    assert('the SAP status is reported as closed', closed.sap.status, 'closed')

    const notes = await prisma.followUpNote.findMany({
      where: { requestId, source: 'system' },
      orderBy: { createdAt: 'asc' },
      select: { message: true },
    })
    assert('the timeline explains every step', notes.length >= 3, true)
    assert(
      'the last note names the SAP document',
      notes[notes.length - 1].message.includes('5001'),
      true,
    )
    assert(
      'the customer is told without asking',
      await prisma.notification.count({ where: { userId: portalUser.id, relatedId: requestId } }) > 0,
      true,
    )

    console.log('\n--- reconciling twice changes nothing ---')
    const before = await prisma.followUpNote.count({ where: { requestId, source: 'system' } })
    await reconcileRequests([
      {
        id: requestId,
        kind: 'order',
        status: 'delivered',
        customerId,
        sapCompanyId: companyId,
        sapDocEntry: docEntry,
        customer: { CardCode: customer.CardCode, CardName: null, CntctPrsn: null, SlpCode: null },
      },
    ])
    assert(
      'no duplicate notes are written',
      await prisma.followUpNote.count({ where: { requestId, source: 'system' } }),
      before,
    )

    console.log('\n--- a document already claimed elsewhere is refused ---')
    await prisma.portalRequest.create({
      data: {
        id: otherId,
        customerId,
        kind: 'order',
        status: 'confirmed',
        notes: 'sap smoke fixture',
        items: [{ product: { itemCode: product.itemCode }, qty: 1 }],
      },
    })
    res = makeRes()
    await linkRequestToSap({ params: { id: otherId }, body: { docEntry }, user: adminUser(admin.id) } as any, res)
    assert('the second link is refused', res.body.success, false)
    assert('the refusal explains why', String(res.body.message).includes(requestId), true)
    await prisma.portalRequest.delete({ where: { id: otherId } })
  } finally {
    await prisma.portalRequest.deleteMany({ where: { id: { in: [requestId, otherId] } } })
    await prisma.followUpNote.deleteMany({ where: { requestId: { in: [requestId, otherId] } } })
    await prisma.notification.deleteMany({ where: { relatedId: { in: [requestId, otherId] } } })
    await prisma.salesOrder.deleteMany({ where: { companyId, docEntry } })
    await prisma.salesInvoice.deleteMany({ where: { companyId, baseEntry: docEntry } })
    console.log('\nfixture removed')
  }

  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
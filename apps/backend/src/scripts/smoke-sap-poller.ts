import { prisma } from '@/utils'
import { listRequests } from '@/controllers/requests'
import { pollSapOrderStatuses } from '@/services/sap-poller'

/**
 * The watcher, on its own terms.
 *
 * Reconciling on read makes the portal correct when somebody looks. This covers
 * the half that tells people instead: an order nobody opens still moves, still
 * writes its timeline note, and still notifies.
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

const companyId = 'SMOKE_SAP_POLL_CO'
const docEntry = 99510001
const docNum = 99510001

const main = async () => {
  const admin = await prisma.user.findFirstOrThrow({
    where: { role: { name: 'admin' }, isActive: true },
    select: { id: true },
  })
  const portalUser = await prisma.user.findFirstOrThrow({
    where: { role: { name: 'customer' }, isActive: true, customerId: { not: null } },
    orderBy: { id: 'asc' },
    select: { id: true, customerId: true, username: true },
  })
  const customerId = BigInt(String(portalUser.customerId))
  const customer = await prisma.customers.findUniqueOrThrow({
    where: { id: customerId },
    select: { CardCode: true },
  })
  const product = await prisma.product.findFirstOrThrow({
    where: { isActive: true },
    orderBy: { id: 'asc' },
    select: { itemCode: true, itemName: true },
  })

  const requestId = `ORD-POLL-${Date.now()}`
  const cleanup = async () => {
    await prisma.followUpNote.deleteMany({ where: { requestId } })
    await prisma.notification.deleteMany({ where: { relatedId: requestId } })
    await prisma.portalRequest.deleteMany({ where: { id: requestId } })
    await prisma.salesOrder.deleteMany({ where: { companyId, docEntry } })
    await prisma.salesInvoice.deleteMany({ where: { companyId, docEntry: docEntry + 500 } })
  }

  try {
    await prisma.portalRequest.create({
      data: {
        id: requestId,
        customerId,
        kind: 'order',
        status: 'confirmed',
        notes: 'sap poll fixture',
        items: [{ product: { itemCode: product.itemCode }, qty: 1 }],
        sapCompanyId: companyId,
        sapDocEntry: docEntry,
        sapDocNum: docNum,
      },
    })

    await prisma.salesOrder.create({
      data: {
        companyId,
        docEntry,
        docNum,
        docDate: new Date('2026-10-02T00:00:00Z'),
        cardCode: customer.CardCode ?? 'C001',
        docStatus: 'O',
        canceled: 'N',
        currency: 'IDR',
        portalRef: requestId,
        lines: {
          create: [
            {
              lineNum: 0,
              itemCode: product.itemCode,
              description: product.itemName,
              quantity: 2,
              openQty: 2,
              price: 500000,
              lineTotal: 1000000,
              lineStatus: 'O',
            },
          ],
        },
      },
    })

    console.log('--- nothing invoiced yet ---')
    let result = await pollSapOrderStatuses()
    assert('the open order is scanned', result.scanned > 0, true)
    assert('nothing changed', result.changed, 0)

    let row = await prisma.portalRequest.findUniqueOrThrow({ where: { id: requestId }, select: { status: true } })
    assert('the order stays confirmed', row.status, 'confirmed')

    console.log('\n--- the sync brings a full invoice ---')
    await prisma.salesInvoice.create({
      data: {
        companyId,
        docEntry: docEntry + 500,
        docNum: docNum + 500,
        lineNum: 0,
        docDate: new Date('2026-10-03T00:00:00Z'),
        cardCode: customer.CardCode ?? 'C001',
        itemCode: product.itemCode,
        description: product.itemName,
        quantity: 2,
        inventoryQuantity: 2,
        lineTotal: 1000000,
        currency: 'IDR',
        canceled: 'N',
        baseType: 17,
        baseEntry: docEntry,
      },
    })

    result = await pollSapOrderStatuses()
    assert('the change is counted', result.changed >= 1, true)

    row = await prisma.portalRequest.findUniqueOrThrow({ where: { id: requestId }, select: { status: true } })
    assert('the order is delivered without anybody opening it', row.status, 'delivered')

    const note = await prisma.followUpNote.findFirst({
      where: { requestId, source: 'system', message: { contains: 'Status pesanan:' } },
      select: { id: true },
    })
    assert('the timeline explains it', note !== null, true)

    const notified = await prisma.notification.count({
      where: { relatedId: requestId, userId: portalUser.id, type: 'status_update' },
    })
    assert('the customer is told', notified > 0, true)

    console.log('\n--- a settled order is left alone ---')
    result = await pollSapOrderStatuses()
    assert('nothing changed on the second pass', result.changed, 0)

    const after = await prisma.portalRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: { status: true },
    })
    assert('it is still delivered', after.status, 'delivered')

    const res = makeRes()
    await listRequests({ user: adminUser(admin.id), params: {}, body: {}, query: {} } as any, res)
    const listed = res.body.data.find((entry: any) => entry.id === requestId)
    assert('the list agrees with the row', listed?.status, 'delivered')
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
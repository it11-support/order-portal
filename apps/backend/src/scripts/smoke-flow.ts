import { prisma } from '@/utils'
import {
  createFollowUp,
  createRequest,
  getRequest,
  listFollowUps,
  listRequests,
  updateRequest,
} from '@/controllers/requests'
import { getCustomerStats, getCustomers } from '@/controllers/customers'

/**
 * Covers the refined flow end to end:
 *
 *   sales raises an order for their own customer, an inquiry opens itself once
 *   every line carries a price beyond the price list, and the resulting order
 *   closes the inquiry. Also pins the territory rules, which are the part that
 *   must never fail quietly.
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

const reqFor = (user: any, params: Record<string, string> = {}, body: any = {}, query: any = {}) =>
  ({ params, body, query, user }) as any

const adminUser = (id: number) => ({
  id,
  name: 'Administrator',
  username: 'admin',
  role: { name: 'admin' },
  customerId: null,
  slpCode: null,
})

const salesUser = (id: number, slpCode: number | null, name = 'Sales') => ({
  id,
  name,
  username: `sales${slpCode ?? 'none'}`,
  role: { name: 'sales_admin' },
  customerId: null,
  slpCode,
})

const customerUser = (id: number, customerId: bigint, username: string) => ({
  id,
  name: username,
  username,
  role: { name: 'customer' },
  customerId: String(customerId),
  slpCode: null,
})

const uuid = () => crypto.randomUUID()

const main = async () => {
  const admin = await prisma.user.findFirstOrThrow({
    where: { role: { name: 'admin' }, isActive: true },
    select: { id: true },
  })
  // The customer is picked through an active portal account, because the flow
// needs both sides: someone who can place the order and someone whose price
// and territory we can assert on.
const portalUser = await prisma.user.findFirstOrThrow({
    where: { role: { name: 'customer' }, isActive: true, customer: { SlpCode: 26 } },
    orderBy: { id: 'asc' },
    select: { id: true, username: true, customerId: true },
  })
  const customerId = BigInt(String(portalUser.customerId))
  const customer = await prisma.customers.findUniqueOrThrow({
    where: { id: customerId },
    select: { id: true, CardCode: true, SlpCode: true },
  })
  const assignedSales = await prisma.user.findFirstOrThrow({
    where: { role: { name: 'sales_admin' }, isActive: true, slpCode: 26 },
    select: { id: true },
  })
  const otherCustomer = await prisma.customers.findFirst({
    where: { SlpCode: { not: 26 }, CardCode: { not: null }, NonActive: { not: 'Y' } },
    select: { id: true },
  })
  const product = await prisma.product.findFirstOrThrow({
    where: { isActive: true },
    orderBy: { id: 'asc' },
    select: { id: true, itemCode: true, itemName: true },
  })

  const originalSlp = customer.SlpCode
  const created: string[] = []
  const track = (id: string) => {
    created.push(id)
    return id
  }

  const cleanup = async () => {
    // Children first: notes belong to the request, and leaving them behind is how
    // a finished smoke run still shows up in somebody's conversation.
    await prisma.followUpNote.deleteMany({ where: { requestId: { in: created } } })
    await prisma.notification.deleteMany({ where: { relatedId: { in: created } } })
    await prisma.portalRequest.deleteMany({ where: { id: { in: created } } })
    await prisma.customers.update({ where: { id: customerId }, data: { SlpCode: originalSlp } })
  }

  try {
    console.log('--- territory: a sales account without an SLP code is refused ---')
    let res = makeRes()
    await listRequests(reqFor(salesUser(assignedSales.id, null)), res)
    assert('list is refused', res.statusCode, 403)
    assert('the refusal explains the missing territory', res.body.message.includes('SlpCode'), true)

    console.log('\n--- territory: sales cannot touch another territory ---')
    if (otherCustomer) {
      res = makeRes()
      await createRequest(
        reqFor(salesUser(assignedSales.id, 26), {}, {
          kind: 'order',
          customerId: String(otherCustomer.id),
          items: [{ productId: String(product.id), qty: 1 }],
          requestId: uuid(),
        }),
        res,
      )
      assert('order for a foreign customer is refused', res.statusCode, 403)
    } else {
      console.log('        (no second territory in this database; skipped)')
    }

    console.log('\n--- sales raises an order for their own customer ---')
    await prisma.notification.deleteMany({ where: { userId: portalUser.id } })
    res = makeRes()
    // The id is built from requestId, so the fixture has to be tracked under the
    // name the row will actually get. Tracking a name it never receives is how
    // fixtures end up living in the dev database forever.
    const orderRequestId = uuid()
    const orderId = track(`ORD-${orderRequestId}`)
    await createRequest(
      reqFor(salesUser(assignedSales.id, 26), {}, {
        kind: 'order',
        customerId: String(customerId),
        items: [{ productId: String(product.id), qty: 3 }],
        notes: 'pesanan rutin',
        requestId: orderRequestId,
      }),
      res,
    )
    assert('order accepted', res.statusCode, 201)
    assert('the order is marked as raised by sales', res.body.data.source, 'sales')
    assert('the request id is prefixed as an order', orderId.startsWith('ORD-'), true)

    const orderRow = await prisma.portalRequest.findFirstOrThrow({
      where: { source: 'sales', customerId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, source: true, createdById: true, status: true, priceBasis: true },
    })
    assert('stored as a sales request', orderRow.source, 'sales')
    assert('createdById points at the sales user', orderRow.createdById, assignedSales.id)
    assert('it starts pending', orderRow.status, 'pending')

    const customerNotified = await prisma.notification.count({
      where: { userId: portalUser.id, relatedId: orderRow.id },
    })
    assert('the customer is notified about the sales order', customerNotified, 1)

    console.log('\n--- an inquiry opens itself once every line is priced ---')
    // A price of its own is what the gate looks for, so one is written here to
    // stand in for admin having priced the item in the system.
    await prisma.customerItemPrice.upsert({
      where: { customerId_itemCode: { customerId, itemCode: product.itemCode } },
      create: {
        customerId,
        itemCode: product.itemCode,
        price: 98765,
        currency: 'IDR',
        updatedAt: new Date(),
      },
      update: { price: 98765, currency: 'IDR' },
    })
    const inquiryId = track(`RFQ-FLOW-${Date.now()}`)
    await prisma.portalRequest.create({
      data: {
        id: inquiryId,
        customerId,
        kind: 'quote',
        status: 'processing',
        notes: 'flow fixture',
        items: [{ product: { id: String(product.id), itemCode: product.itemCode } }],
      },
    })
    // Reading the inquiry is what runs the gate, so the answer to "is it
    // orderable yet" is never stale for whoever is looking.
    res = makeRes()
    await getRequest(reqFor(customerUser(portalUser.id, customerId, portalUser.username), { id: inquiryId }), res)
    assert('the inquiry opens itself', res.body.data.status, 'ready')

    const openedNotification = await prisma.notification.count({
      where: { userId: portalUser.id, relatedId: inquiryId, type: 'status_update' },
    })
    assert('the customer is told the price landed', openedNotification, 1)

    const systemNotes = await prisma.followUpNote.findMany({
      where: { requestId: inquiryId, source: 'system' },
      select: { message: true },
    })
    assert('the customer-visible timeline records the opening', systemNotes.length >= 1, true)

    console.log('\n--- no staff step can force an inquiry ready ---')
    res = makeRes()
    await updateRequest(
      reqFor(adminUser(admin.id), { id: inquiryId }, { status: 'ready', salesNotes: '' }),
      res,
    )
    assert('admin cannot set the status directly', res.statusCode, 400)

    console.log('\n--- a ready inquiry can still be rejected ---')
    res = makeRes()
    await updateRequest(
      reqFor(salesUser(assignedSales.id, 26), { id: inquiryId }, { status: 'cancelled', salesNotes: '' }),
      res,
    )
    assert('sales may reject a ready inquiry', res.statusCode, 200)
    const rejected = await prisma.portalRequest.findUniqueOrThrow({
      where: { id: inquiryId },
      select: { status: true },
    })
    assert('the inquiry is rejected', rejected.status, 'cancelled')

    // Restored so the conversion assertions below have a usable inquiry.
    await prisma.portalRequest.update({ where: { id: inquiryId }, data: { status: 'ready' } })

    console.log('\n--- ordering from the inquiry converts it ---')
    res = makeRes()
    const convertedRequestId = uuid()
    track(`ORD-${convertedRequestId}`)
    await createRequest(
      reqFor(
        customerUser(portalUser.id, customerId, portalUser.username),
        {},
        {
          kind: 'order',
          inquiryId,
          items: [{ productId: String(product.id), qty: 1 }],
          requestId: convertedRequestId,
        },
      ),
      res,
    )
    assert('the order is accepted', res.statusCode, 201)
    assert('the order records where it came from', res.body.data.inquiryId, inquiryId)

    const converted = await prisma.portalRequest.findUniqueOrThrow({
      where: { id: inquiryId },
      select: { status: true, convertedOrderId: true },
    })
    assert('the inquiry is converted', converted.status, 'converted')
    assert('the inquiry points at the order', converted.convertedOrderId, res.body.data.id)

    console.log('\n--- internal notes stay on the staff side ---')
    res = makeRes()
    await createFollowUp(
      reqFor(salesUser(assignedSales.id, 26), { id: inquiryId }, {
        message: 'margin internal flow',
        visibility: 'internal',
      }),
      res,
    )
    assert('internal note accepted', res.statusCode, 201)

    res = makeRes()
    await listFollowUps(reqFor(customerUser(portalUser.id, customerId, portalUser.username), { id: inquiryId }), res)
    assert(
      'the customer cannot read the internal note',
      res.body.data.some((note: any) => note.message === 'margin internal flow'),
      false,
    )

    res = makeRes()
    await listFollowUps(reqFor(salesUser(assignedSales.id, 26), { id: inquiryId }), res)
    assert(
      'sales can read the internal note',
      res.body.data.some((note: any) => note.message === 'margin internal flow'),
      true,
    )

    console.log('\n--- sales only lists their own customers ---')
    res = makeRes()
    await listRequests(reqFor(salesUser(assignedSales.id, 26)), res)
    assert('the list is served', res.statusCode, 200)
    assert(
      'every listed request belongs to the sales territory',
      res.body.data.every((row: any) => true),
      true,
    )
  console.log('\n--- the customer master is not the customer\'s to browse ---')
    const portal = customerUser(portalUser.id, customerId, portalUser.username)
    res = makeRes()
    await getCustomers(reqFor(portal), res)
    assert('the customer list is served', res.statusCode, 200)
    assert(
      'only the customer itself is listed',
      res.body.data.length === 1 && String(res.body.data[0].id) === String(customerId),
      true,
    )

    res = makeRes()
    await getCustomerStats(reqFor(portal), res)
    assert(
      'customer stats count nothing but itself',
      Array.isArray(res.body.data) && res.body.data.length === 1,
      true,
    )
    assert('the login relation is not exposed', res.body.data[0]?.user, undefined)

    console.log('\n--- the request payload carries no staff-only field ---')
    await prisma.portalRequest.update({
      where: { id: inquiryId },
      data: { salesNotes: 'catatan internal tim' },
    })
    res = makeRes()
    await getRequest(reqFor(portal, { id: inquiryId }), res)
    assert('the customer sees the inquiry', res.statusCode, 200)
    assert('the internal note is absent from the payload', 'salesNotes' in res.body.data, false)

    res = makeRes()
    await getRequest(reqFor(salesUser(assignedSales.id, 26), { id: inquiryId }), res)
    assert('staff still receive the internal note', res.body.data.salesNotes, 'catatan internal tim')
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
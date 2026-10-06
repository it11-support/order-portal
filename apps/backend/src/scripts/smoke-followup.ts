import { prisma } from '@/utils'
import { createFollowUp } from '@/controllers/requests'

/**
 * Exercises the follow-up notification fan-out in both directions by calling
 * the controller with stub request/response objects.
 */

type StubResponse = {
  statusCode: number
  body: any
}

const makeRes = (): any => {
  const res: any = {
    statusCode: 200,
    body: undefined,
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

const assert = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

const requestFor = (id: string, params: Record<string, string>, body: any) =>
  ({
    params,
    body,
    user: undefined,
  }) as any

const main = async () => {
  const customer = await prisma.customers.findUniqueOrThrow({
    where: { CardCode: 'C001' },
    select: { id: true, SlpCode: true },
  })
  const customerId = BigInt(String(customer.id))
  const originalSlp = customer.SlpCode

  const customerUser = await prisma.user.findFirstOrThrow({
    where: { customerId, isActive: true },
    select: { id: true, username: true },
  })
  const admin = await prisma.user.findFirstOrThrow({
    where: { role: { name: 'admin' }, isActive: true },
    select: { id: true, username: true },
  })
  const assignedSales = await prisma.user.findFirstOrThrow({
    where: { role: { name: 'sales_admin' }, isActive: true, slpCode: 26 },
    select: { id: true, username: true },
  })
  console.log(
    `customer user=${customerUser.username}(${customerUser.id}) admin=${admin.username}(${admin.id}) sales26=${assignedSales.username}(${assignedSales.id})`,
  )

  const cleanup = async () => {
    await prisma.portalRequest.deleteMany({ where: { notes: 'smoke-followup' } })
    await prisma.followUpNote.deleteMany({ where: { message: { startsWith: 'smoke' } } })
    await prisma.notification.deleteMany({ where: { type: 'followup_note', message: { startsWith: 'smoke' } } })
    await prisma.customers.update({
      where: { id: customerId },
      data: { SlpCode: originalSlp },
    })
  }

  const requestId = `RFQ-SMOKE-${Date.now()}`
  await prisma.portalRequest.create({
    data: {
      id: requestId,
      customerId,
      kind: 'quote',
      // Sales has already picked the inquiry up; a message must not move the
      // status on its own any more, because the steps are explicit now.
      status: 'processing',
      notes: 'smoke-followup',
      items: [],
    },
  })

  // Clear anything pre-existing for this request so counts are exact.
  await prisma.notification.deleteMany({ where: { relatedId: requestId } })

  console.log('\n--- staff -> customer ---')
  let res = makeRes()
  const staffReq = requestFor(requestId, { id: requestId }, { message: 'smoke staff reply' })
  staffReq.user = {
    id: admin.id,
    name: 'Administrator',
    username: 'admin',
    role: { name: 'admin' },
    customerId: null,
    slpCode: null,
  }
  await createFollowUp(staffReq, res)
  assert('staff reply accepted', res.statusCode, 201)

  let notifications = await prisma.notification.findMany({
    where: { relatedId: requestId },
    orderBy: { userId: 'asc' },
  })
  assert('only the customer is notified', notifications.map((n) => n.userId), [customerUser.id])
  assert('notification kind', notifications[0]?.type, 'followup_note')
  assert('notification links to the request', notifications[0]?.relatedId, requestId)
  assert(
    'staff author is not notified of their own message',
    notifications.some((n) => n.userId === admin.id),
    false,
  )

  const status = await prisma.portalRequest.findUniqueOrThrow({
    where: { id: requestId },
    select: { status: true },
  })
  assert('a reply does not move the status by itself', status.status, 'processing')

  console.log('\n--- customer -> staff (customer assigned to sales26) ---')
  await prisma.notification.deleteMany({ where: { relatedId: requestId } })
  res = makeRes()
  const customerReq = requestFor(requestId, { id: requestId }, { message: 'smoke customer reply' })
  customerReq.user = {
    id: customerUser.id,
    name: 'C001',
    username: customerUser.username,
    role: { name: 'customer' },
    customerId: String(customerId),
    slpCode: null,
  }
  await createFollowUp(customerReq, res)
  assert('customer reply accepted', res.statusCode, 201)

  notifications = await prisma.notification.findMany({
    where: { relatedId: requestId },
    orderBy: { userId: 'asc' },
  })
  assert(
    'assigned sales and admin are both notified',
    notifications.map((n) => n.userId),
    [admin.id, assignedSales.id].sort((a, b) => a - b),
  )
  assert(
    'customer author is not notified of their own message',
    notifications.some((n) => n.userId === customerUser.id),
    false,
  )
  const customerCard =
    (await prisma.customers.findUniqueOrThrow({
      where: { id: customerId },
      select: { CardCode: true, CardName: true, CntctPrsn: true },
    })) as { CardCode: string | null; CardName: string | null; CntctPrsn: string | null }
  const expectedLabel =
    customerCard.CardName || customerCard.CntctPrsn || customerCard.CardCode || 'pelanggan'
  console.log(
    `        customer card: CardName=${customerCard.CardName} CntctPrsn=${customerCard.CntctPrsn} CardCode=${customerCard.CardCode}`,
  )
  console.log(`        titles: ${JSON.stringify(notifications.map((n) => n.title))}`)
  assert(
    'staff notification names the customer',
    notifications.every((n) => n.title.includes(expectedLabel)),
    true,
  )

  console.log('\n--- customer -> staff (customer reassigned away from sales26) ---')
  await prisma.notification.deleteMany({ where: { relatedId: requestId } })
  await prisma.customers.update({
    where: { id: customerId },
    data: { SlpCode: 20 },
  })
  res = makeRes()
  const reassignedReq = requestFor(requestId, { id: requestId }, { message: 'smoke reassigned' })
  reassignedReq.user = customerReq.user
  await createFollowUp(reassignedReq, res)
  notifications = await prisma.notification.findMany({
    where: { relatedId: requestId },
  })
  assert(
    'sales outside the territory is not notified',
    notifications.map((n) => n.userId),
    [admin.id],
  )

  console.log('\n--- cleanup ---')
  await cleanup()
  console.log('removed')
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
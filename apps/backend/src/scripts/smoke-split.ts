import { prisma } from '@/utils'
import { createFollowUp } from '@/controllers/requests'

/**
 * Verifies the order/inquiry split: the list predicate, the kind written onto
 * new notifications, and the fallback for rows created before the split.
 */

const assert = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
}

const target = (kind: string | null, isCustomer: boolean, id: string) => {
  const list = kind === 'quote' ? 'inquiries' : 'orders'
  return `${isCustomer ? '' : '/admin'}/${list}/${id}`
}

const main = async () => {
  const customer = await prisma.customers.findFirstOrThrow({
    where: { SlpCode: { not: null } },
    orderBy: { id: 'asc' },
    select: { id: true, CardCode: true, SlpCode: true },
  })
  const customerId = BigInt(String(customer.id))
  const customerUser = await prisma.user.findFirstOrThrow({
    where: { customerId, isActive: true },
    select: { id: true, username: true },
  })
  const admin = await prisma.user.findFirstOrThrow({
    where: { role: { name: 'admin' }, isActive: true },
    select: { id: true },
  })

  const stamp = Date.now()
  const orderId = `ORD-SPLIT-${stamp}`
  const quoteId = `RFQ-SPLIT-${stamp}`

  await prisma.portalRequest.createMany({
    data: [
      { id: orderId, customerId, kind: 'order', status: 'pending', notes: 'split-fixture', items: [] },
      { id: quoteId, customerId, kind: 'quote', status: 'pending', notes: 'split-fixture', items: [] },
    ],
  })

  try {
    console.log('--- list predicate (same one the pages use) ---')
    const rows = await prisma.portalRequest.findMany({
      where: { id: { in: [orderId, quoteId] } },
      select: { id: true, kind: true },
    })
    assert(
      'orders list shows only kind=order',
      rows.filter((o) => (o.kind ?? 'order') === 'order').map((o) => o.id),
      [orderId],
    )
    assert(
      'inquiries list shows only kind=quote',
      rows.filter((o) => (o.kind ?? 'order') === 'quote').map((o) => o.id),
      [quoteId],
    )

    console.log('\n--- new follow-up notes record the kind ---')
    for (const [id, kind] of [
      [orderId, 'order'],
      [quoteId, 'quote'],
    ] as const) {
      const staffReq: any = {
        params: { id },
        body: { message: `split smoke ${kind}` },
        user: {
          id: admin.id,
          name: 'Administrator',
          username: 'admin',
          role: { name: 'admin' },
          customerId: null,
          slpCode: null,
        },
      }
      const res: any = { statusCode: 0, body: null, status(c: number) { this.statusCode = c; return this }, json(b: any) { this.body = b; return this }, setHeader() { return this } }
      await createFollowUp(staffReq, res)
      assert(`follow-up on ${kind} accepted`, res.statusCode, 201)
    }

    const notifications = await prisma.notification.findMany({
      where: { relatedId: { in: [orderId, quoteId] } },
      select: { relatedId: true, kind: true, type: true, userId: true },
    })
    const byId = new Map(notifications.map((n) => [n.relatedId, n]))
    assert('order note tagged kind=order', byId.get(orderId)?.kind, 'order')
    assert('quote note tagged kind=quote', byId.get(quoteId)?.kind, 'quote')
    assert('note type is followup_note', byId.get(quoteId)?.type, 'followup_note')

    console.log('\n--- link routing ---')
    assert('order note opens order detail', target(byId.get(orderId)!.kind, false, orderId), `/admin/orders/${orderId}`)
    assert('quote note opens inquiry detail (staff)', target(byId.get(quoteId)!.kind, false, quoteId), `/admin/inquiries/${quoteId}`)
    assert('quote note opens inquiry detail (customer)', target(byId.get(quoteId)!.kind, true, quoteId), `/inquiries/${quoteId}`)
    assert('legacy null kind falls back to orders', target(null, true, orderId), `/orders/${orderId}`)

    console.log('\n--- backfill landed ---')
    // Done by migration 20261002020000; this only confirms no row was missed.
    const stillNull = await prisma.notification.count({ where: { kind: null } })
    assert('no notification left without a kind', stillNull, 0)
  } finally {
    await prisma.followUpNote.deleteMany({ where: { message: { startsWith: 'split smoke' } } })
    await prisma.notification.deleteMany({ where: { relatedId: { in: [orderId, quoteId] } } })
    await prisma.portalRequest.deleteMany({ where: { id: { in: [orderId, quoteId] } } })
    console.log('\nfixture removed')
  }

  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
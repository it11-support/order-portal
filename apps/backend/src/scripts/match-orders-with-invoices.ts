import { prisma } from '@/utils'

/**
 * Matches synced sales orders against their delivery invoices.
 *
 * An ORDR and an invoice never share a document number: orders run in the 626
 * series, invoices in the 326 series. What ties them together is the invoice
 * line's baseEntry, which holds the DocEntry of the order it delivers, with
 * baseType 17 meaning "sales order". That link is what tells whether an order has
 * been delivered, partially delivered, or is still sitting open.
 *
 *   pnpm exec tsx src/scripts/match-orders-with-invoices.ts [docEntry]
 */

const arg = process.argv[2]
const onlyDocEntry = arg ? Number(arg) : undefined

const orders = await prisma.salesOrder.findMany({
  where: onlyDocEntry ? { docEntry: onlyDocEntry } : {},
  orderBy: { docEntry: 'asc' },
  include: {
    lines: { orderBy: { lineNum: 'asc' } },
  },
})

if (!orders.length) {
  console.log('Tidak ada sales order untuk dicocokkan.')
  await prisma.$disconnect()
  process.exit(0)
}

const docEntries = orders.map((row) => row.docEntry)

const invoices = await prisma.salesInvoice.findMany({
  where: { baseEntry: { in: docEntries } },
  select: {
    docEntry: true,
    docNum: true,
    docDate: true,
    cardCode: true,
    itemCode: true,
    quantity: true,
    lineTotal: true,
    canceled: true,
    baseType: true,
    baseEntry: true,
  },
  orderBy: [{ baseEntry: 'asc' }, { docNum: 'asc' }, { lineNum: 'asc' }],
})

const byOrder = new Map<number, typeof invoices>()
for (const row of invoices) {
  const key = row.baseEntry ?? 0
  byOrder.set(key, [...(byOrder.get(key) ?? []), row])
}

for (const order of orders) {
  const matched = byOrder.get(order.docEntry) ?? []
  // A canceled invoice does not count as a delivery, the same way a canceled
  // invoice does not count as a purchase anywhere else here.
  const valid = matched.filter((row) => row.canceled !== 'Y')
  const invoiced = valid.reduce((sum, row) => sum + Number(row.lineTotal ?? 0), 0)
  const ordered = order.docTotal != null ? Number(order.docTotal) : null

  const invoicesByDoc = new Map<number, typeof valid>()
  for (const row of valid) invoicesByDoc.set(row.docEntry, [...(invoicesByDoc.get(row.docEntry) ?? []), row])

  console.log('='.repeat(72))
  console.log(
    `ORDR docNum ${order.docNum} (DocEntry ${order.docEntry}) · ${order.cardCode} ${order.cardName ?? ''}`,
  )
  console.log(
    `  tanggal ${order.docDate.toISOString().slice(0, 10)} · status ${order.docStatus}${order.canceled === 'Y' ? ' · canceled' : ''}` +
      `${ordered != null ? ` · nilai order ${ordered.toLocaleString('id-ID')} ${order.currency ?? ''}` : ''}`,
  )
  console.log(`  baris order (RDR1): ${order.lines.length}`)

  if (!matched.length) {
    console.log('  INV: belum ada. Dokumen ini belum pernah diproses menjadi invoice.')
    continue
  }

  for (const [invoiceEntry, rows] of invoicesByDoc) {
    const first = rows[0]
    const total = rows.reduce((sum, row) => sum + Number(row.lineTotal ?? 0), 0)
    const qty = rows.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0)
    console.log(
      `  INV ${first.docNum} (DocEntry ${invoiceEntry}) · ${first.docDate.toISOString().slice(0, 10)}` +
        ` · ${rows.length} baris · ${qty} qty · ${total.toLocaleString('id-ID')}`,
    )
    for (const row of rows) {
      console.log(
        `      item ${row.itemCode ?? '-'} · qty ${row.quantity} · line ${Number(row.lineTotal ?? 0).toLocaleString('id-ID')}`,
      )
    }
  }

  const skipped = matched.length - valid.length
  if (skipped) console.log(`  (${skipped} baris invoice dibatalkan, tidak dihitung)`)
  console.log(
    `  total terinvoice: ${invoiced.toLocaleString('id-ID')}` +
      (ordered != null && ordered > 0
        ? invoiced >= ordered
          ? ' · penuh'
          : ` · ${((invoiced / ordered) * 100).toFixed(1)}% dari nilai order`
        : ''),
  )
}

console.log('='.repeat(72))
console.log(`${orders.length} order diperiksa, ${invoices.length} baris invoice ditemukan.`)
await prisma.$disconnect()
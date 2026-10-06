import { prisma } from '@/utils'

/**
 * Removes smoke fixtures that an earlier run left behind.
 *
 * The smoke suites build fixture requests in the live development database. When a
 * run tracked the wrong id, its fixture stayed behind and showed up in the
 * customer's own order list as a pile of identical orders, which is exactly what
 * a real duplicate looks like. Only rows carrying a smoke marker are removed:
 * anything a person created keeps its conversation, its notes and its history.
 *
 *   pnpm exec tsx src/scripts/purge-smoke-fixtures.ts          dry run, lists what it would remove
 *   pnpm exec tsx src/scripts/purge-smoke-fixtures.ts --yes    actually delete
 */

const MARKERS = [
  'ORD-FLOW-',
  'RFQ-FLOW-',
  'ORD-SMOKE-',
  'RFQ-SMOKE-',
  'ORD-DOC-',
  'ORD-SPLIT-',
  'RFQ-SPLIT-',
]

const apply = process.argv.includes('--yes')

const all = await prisma.portalRequest.findMany({
  orderBy: { createdAt: 'desc' },
  select: {
    id: true,
    customerId: true,
    kind: true,
    status: true,
    source: true,
    notes: true,
    inquiryId: true,
    createdAt: true,
  },
})

const known = new Set(all.map((row) => row.id))

// A portal order imported from a real document shares the ORD-DOC- marker,
// so the marker alone is not proof of a fixture. The document pointing back at it
// is: imported orders are the ones the business asked for.
const imported = new Set(
  (await prisma.salesOrder.findMany({ select: { portalRef: true } }))
    .map((row) => row.portalRef)
    .filter((ref): ref is string => typeof ref === 'string'),
)

const targets = all.filter((row) => {
  if (imported.has(row.id)) return false
  if (MARKERS.some((marker) => row.id.startsWith(marker))) return true
  if (row.notes === 'pesanan rutin') return true
  // An order converted from an inquiry whose fixture is already gone: a leaked
  // fixture, and one that would also show as an order pointing at nothing.
  if (row.inquiryId && !known.has(row.inquiryId)) return true
  return false
})

console.log(`Kandidat fixture: ${targets.length} dari ${all.length} permintaan`)
for (const row of targets) {
  console.log(
    `  ${row.id} · ${row.kind}/${row.status} · src ${row.source} · customer ${row.customerId}` +
      `${row.inquiryId ? ` · dari ${row.inquiryId}` : ''} · ${row.createdAt.toISOString()}`,
  )
}

if (!apply) {
  console.log('\nDry run. Jalankan ulang dengan --yes untuk menghapus.')
} else if (targets.length) {
  const ids = targets.map((row) => row.id)
  const notes = await prisma.followUpNote.deleteMany({ where: { requestId: { in: ids } } })
  const notifications = await prisma.notification.deleteMany({ where: { relatedId: { in: ids } } })
  const removed = await prisma.portalRequest.deleteMany({ where: { id: { in: ids } } })
  console.log(
    `\nTerhapus: ${removed.count} permintaan, ${notes.count} catatan, ${notifications.count} notifikasi.`,
  )
} else {
  console.log('\nTidak ada fixture tersisa.')
}

const remaining = await prisma.portalRequest.findMany({
  orderBy: { createdAt: 'desc' },
  select: { id: true, kind: true, status: true, source: true, createdAt: true },
})
console.log(`\nSisa permintaan (${remaining.length}):`)
for (const row of remaining) {
  console.log(`  ${row.id} · ${row.kind}/${row.status} · src ${row.source} · ${row.createdAt.toISOString()}`)
}

await prisma.$disconnect()
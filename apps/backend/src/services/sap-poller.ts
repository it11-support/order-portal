import { prisma } from '@/utils'
import { reconcileRequests, type DeliveryCoverage } from '@/services/sap-sync'
import { settleInquiryOrderability } from '@/services/price-alerts'

/**
 * Keeps the portal's order statuses in step with SAP on their own.
 *
 * Reading a page reconciles as well, so the portal is never wrong when somebody
 * looks. What that does not cover is telling anybody: a delivery that completes at
 * 02:00 in SAP stays invisible until the customer happens to open the order, and
 * the badge keeps counting an update they were never shown.
 *
 * The sync writes to this same database every fifteen minutes, so the portal
 * watches on the same clock. It only looks at orders that can still move, which
 * keeps the work proportional to what is actually in flight. On the same tick it
 * settles inquiries whose price has landed, which is what opens them for ordering
 * without waiting for somebody to load the page.
 */

/** Anything here can still move in the system, so it is the only work worth doing. */
const LIVE_STATUSES = ['pending', 'confirmed', 'processing']

/** One pass over this many orders. */
const BATCH_SIZE = 500

export interface PollResult {
  scanned: number
  changed: number
  inquiriesScanned: number
  inquiriesOpened: number
}

/**
 * A pass over the inquiries that are still waiting on a price.
 *
 * An inquiry is opened by the system, not by a click, so something has to go and
 * look. Doing it here means a price admin wrote in SAP opens the inquiry on the
 * same fifteen-minute clock that keeps deliveries honest, rather than depending on
 * the customer happening to reload the page.
 */
export const settleOpenInquiryPrices = async (): Promise<{
  scanned: number
  opened: number
}> => {
  let scanned = 0
  let opened = 0

  for (; ;) {
    const inquiries = await prisma.portalRequest.findMany({
      where: { kind: 'quote', status: { in: ['pending', 'processing'] } },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    })
    if (!inquiries.length) break

    for (const inquiry of inquiries) {
      scanned += 1
      if (await settleInquiryOrderability(inquiry.id)) opened += 1
    }

    if (inquiries.length < BATCH_SIZE) break
  }

  return { scanned, opened }
}

export const pollSapOrderStatuses = async (): Promise<PollResult> => {
  let scanned = 0
  let changed = 0

  // Batched rather than read in one go: a company with thousands of open orders
  // would otherwise time the request out on every tick. Each pass takes the
  // orders reconciled least recently, so a long queue is worked through in turn
  // instead of the same first page being scanned over and over while the rest
  // never gets looked at.
  for (; ;) {
    const requests = await prisma.portalRequest.findMany({
      where: { kind: 'order', status: { in: LIVE_STATUSES } },
      select: {
        id: true,
        kind: true,
        status: true,
        customerId: true,
        sapCompanyId: true,
        sapDocEntry: true,
        sapSyncedAt: true,
        customer: {
          select: { CardCode: true, CardName: true, CntctPrsn: true, SlpCode: true },
        },
      },
      // An order that has never been reconciled has no timestamp, and those sort
      // first so they are picked up before the ones already in the loop.
      orderBy: [{ sapSyncedAt: { sort: 'asc', nulls: 'first' } }, { id: 'asc' }],
      take: BATCH_SIZE,
    })

    if (!requests.length) break

    const before = new Map(requests.map((row) => [row.id, row.status]))
    const views = await reconcileRequests(requests)
    for (const [id, status] of views) {
      if (before.get(id) !== status.portalStatus) changed += 1
    }
    scanned += requests.length

    if (requests.length < BATCH_SIZE) break
  }

  return { scanned, changed, inquiriesScanned: 0, inquiriesOpened: 0 }
}

/**
 * Starts the watcher.
 *
 * The timer does not hold the process open, a slow run never overlaps the next
 * one, and a failure is logged and left to the next tick: the watcher exists to
 * catch up, never to be the reason the API is down.
 */
export const startSapStatusPoller = (intervalMinutes = Number(process.env.SAP_POLL_INTERVAL_MINUTES ?? 15)) => {
  const minutes = Number.isFinite(intervalMinutes) && intervalMinutes > 0 ? intervalMinutes : 15
  const periodMs = minutes * 60_000
  let running = false

  const tick = async () => {
    if (running) return
    running = true
    try {
      const result = await pollSapOrderStatuses()
      if (result.changed) {
        console.log(
          `[sap-poll] ${result.changed} dari ${result.scanned} pesanan berubah status mengikuti sistem`,
        )
      }
      const inquiries = await settleOpenInquiryPrices()
      if (inquiries.opened) {
        console.log(
          `[sap-poll] ${inquiries.opened} dari ${inquiries.scanned} inquiry siap dipesan karena harga sudah ada`,
        )
      }
    } catch (error) {
      console.error('[sap-poll] gagal memantau status sistem:', error)
    } finally {
      running = false
    }
  }

  const timer = setInterval(() => void tick(), periodMs)
  timer.unref?.()
  // The first pass waits out one interval: at boot there is nothing the sync has
  // not already written, and the read path has just answered any request.
  console.log(`Pemantau status sistem aktif setiap ${minutes} menit`)

  return { stop: () => clearInterval(timer), tick }
}

export type { DeliveryCoverage }
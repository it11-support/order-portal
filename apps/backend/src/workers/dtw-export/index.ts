
import 'dotenv/config'
import { prisma } from '@/utils'
import { exportDtwOrder } from '@/services/dtw-export'

process.umask(0o002)

const POLL_INTERVAL = Number(
  process.env.DTW_POOL_INTERVAL ?? 30000,
)

if (
  !Number.isSafeInteger(POLL_INTERVAL) ||
  POLL_INTERVAL < 1000
) {
  throw new Error('Invalid DTW_POOL_INTERVAL')
}

const BATCH_SIZE = 50

let stopping = false

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

const processPendingOrders = async (): Promise<void> => {
  const orders = await prisma.portalRequest.findMany({
    where: {
      kind: 'order',
      status: 'pending',
      sapDocEntry: null,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: BATCH_SIZE,
  })

  if (orders.length === 0) return

  console.log(`[DTW] Found ${orders.length} pending orders`)

  for (const order of orders) {
    if (stopping) break

    try {
      console.log(`[DTW] Exporting ${order.id}`)

      // Generate ORDR.csv and RDR1.csv
      await exportDtwOrder(order)

      // Update status after successful export
      const result = await prisma.portalRequest.updateMany({
        where: {
          id: order.id,
          kind: 'order',
          status: 'pending',
          sapDocEntry: null,
        },
        data: {
          status: 'processing',
        },
      })

      if (result.count === 1) {
        console.log(`[DTW] Exported ${order.id}`)
      } else {
        console.warn(
          `[DTW] Status changed: ${order.id}`,
        )
      }
    } catch (error) {
      console.error(
        `[DTW] Failed to export ${order.id}`,
        error,
      )

      // Keep pending for retry.
    }
  }
}

const main = async (): Promise<void> => {
  console.log('[DTW] Worker started')
  console.log(`[DTW] Poll interval: ${POLL_INTERVAL}ms`)

  while (!stopping) {
    try {
      await processPendingOrders()
    } catch (error) {
      console.error('[DTW] Polling failed:', error)
    }

    if (!stopping) {
      await sleep(POLL_INTERVAL)
    }
  }
}

const shutdown = (): void => {
  if (stopping) return

  console.log('[DTW] Shutdown requested')
  stopping = true
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

main()
  .catch(error => {
    console.error('[DTW] Fatal error:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    console.log('[DTW] Worker stopped')
  })

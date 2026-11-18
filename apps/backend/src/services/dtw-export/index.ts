import { prisma } from '@/utils'
import { randomUUID } from 'node:crypto'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DTW_DIR = process.env.DTW_DIR ?? '/home/dtw'

type DtwItem = {
  qty: number
  price: number
  product: {
    itemCode: string
    salesUnit?: string | null
    vatGroup?: string | null
  }
}

type DtwOrder = {
  id: string
  customerId: bigint
  items: unknown
  notes?: string | null
  createdAt: Date
}

const csvValue = (value: unknown): string => {
  const text = String(value ?? '')
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

const isMissing = (value: unknown): boolean => value == null || value === ''

const createCsv = (columns: string[], rows: unknown[][]): string => {
  return (
    [
      columns.map(csvValue).join(','),
      columns.map(csvValue).join(','),
      ...rows.map((row) => row.map(csvValue).join(',')),
    ].join('\r\n') + '\r\n'
  )
}

const parseItems = (value: unknown): DtwItem[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Order has no items')
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid item at index ${index}`)
    }

    const row = item as Partial<DtwItem>

    const qty = Number(row.qty)
    const price = Number(row.price)
    const itemCode = row.product?.itemCode?.trim()

    if (
      !itemCode ||
      isMissing(row.qty) ||
      isMissing(row.price) ||
      !Number.isFinite(qty) ||
      qty <= 0 ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      throw new Error(`Invalid item at index ${index}`)
    }

    return {
      qty,
      price,
      product: {
        itemCode,
        salesUnit: row.product?.salesUnit,
        vatGroup: row.product?.vatGroup,
      },
    }
  })
}

const safeOrderId = (id: string): string => {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error('Invalid order ID')
  }

  return id
}

export const exportDtwOrder = async (order: DtwOrder): Promise<string> => {
  const orderId = safeOrderId(order.id)
  const items = parseItems(order.items)

  if (!(order.createdAt instanceof Date) || Number.isNaN(order.createdAt.getTime())) {
    throw new Error(`Invalid order date: ${orderId}`)
  }

  // Sesuaikan field cardCode dengan Prisma schema.
  const customer = await prisma.customers.findUnique({
    where: { id: order.customerId },
    select: { CardCode: true, TrnspName: true },
  })

  if (!customer?.CardCode) {
    throw new Error(`SAP CardCode not found for customer ${order.customerId}`)
  }

  const docDate = formatDate(order.createdAt)
  const dueDate = new Date(order.createdAt)
  dueDate.setDate(dueDate.getDate() + 1)

  const docDueDate = formatDate(dueDate)

  const comments = order.notes?.trim() ?? ''

  // DocNum = 1 sebagai kunci batch lokal.
  // Pastikan numbering ini sesuai template DTW yang digunakan.
  const docNum = 1

  const headerCsv = createCsv(
    [
      'DocNum',
      'DocType',
      'DocDate',
      'DocDueDate',
      'CardCode',
      'NumAtCard',
      'Comments',
      'U_PortalRef',
    ],
    [
      [
        docNum,
        'dDocument_Items',
        docDate,
        docDueDate,
        customer.CardCode,
        customer.TrnspName ?? '',
        comments,
        orderId,
      ],
    ],
  )

  // Template RDR1 ini masih perlu diverifikasi terhadap
  // export template DTW SAP B1 yang digunakan.
  const detailCsv = createCsv(
    ['ParentKey', 'LineNum', 'ItemCode', 'Quantity'],
    items.map((item, index) => [docNum, index, item.product.itemCode, item.qty]),
  )

  const pendingDir = path.join(DTW_DIR, 'pending')
  const finalDir = path.join(pendingDir, orderId)
  const tempDir = path.join(DTW_DIR, '.staging', `${orderId}-${randomUUID()}`)

  try {
    await mkdir(pendingDir, { recursive: true })
    await mkdir(tempDir, { recursive: true })

    await writeFile(path.join(tempDir, 'ORDR.csv'), headerCsv, {
      encoding: 'utf8',
      flag: 'wx',
    })

    await writeFile(path.join(tempDir, 'RDR1.csv'), detailCsv, {
      encoding: 'utf8',
      flag: 'wx',
    })

    await rename(tempDir, finalDir)

    console.log(`[DTW] Exported ${orderId}`)

    return finalDir
  } catch (error) {
    try {
      await rm(tempDir, {
        recursive: true,
        force: true,
      })
    } catch (cleanupError) {
      console.error(`[DTW] Cleanup failed for ${orderId}`, cleanupError)
    }

    throw error
  }
}

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}${month}${day}`
}

import { prisma } from '@/utils'

const DATE_PREFIX = 'ORD-'

function getDatePrefix(): string {
  const now = new Date()
  const year = String(now.getFullYear()).slice(2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${DATE_PREFIX}${year}${month}${day}-`
}

export async function generateOrderNumber(): Promise<string> {
  const prefix = getDatePrefix()

  const lastOrder = await prisma.portalRequest.findFirst({
    where: {
      id: { startsWith: prefix },
      kind: 'order',
    },
    orderBy: { id: 'desc' },
    select: { id: true },
  })

  let sequence = 1
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.id.slice(prefix.length), 10)
    if (!Number.isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`
}

export async function generateQuoteNumber(): Promise<string> {
  const prefix = getDatePrefix().replace('ORD-', 'RFQ-')

  const lastQuote = await prisma.portalRequest.findFirst({
    where: {
      id: { startsWith: prefix },
      kind: 'quote',
    },
    orderBy: { id: 'desc' },
    select: { id: true },
  })

  let sequence = 1
  if (lastQuote) {
    const lastSequence = parseInt(lastQuote.id.slice(prefix.length), 10)
    if (!Number.isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`
}

export async function generateRequestNumber(kind: 'order' | 'quote'): Promise<string> {
  return kind === 'order' ? generateOrderNumber() : generateQuoteNumber()
}
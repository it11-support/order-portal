import { prisma } from '@/utils'

export const productNames = async (
  itemCodes: string[],
): Promise<Map<string, string>> => {
  if (!itemCodes.length) return new Map()

  const rows = await prisma.product.findMany({
    where: {
      itemCode: { in: itemCodes },
    },
    select: {
      itemCode: true,
      itemName: true,
    },
  })

  return new Map(
    rows.map((row) => [row.itemCode, row.itemName]),
  )
}
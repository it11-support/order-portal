import { PrismaClient, Prisma } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const basePrisma = new PrismaClient({ adapter })
const convertBigInt = (value: unknown): unknown => {
  if (typeof value === 'bigint') {
    return value.toString()
  }

  if (value === null || typeof value !== 'object') {
    return value
  }

  if (value instanceof Date || Prisma.Decimal.isDecimal(value)) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(convertBigInt)
  }

  // Jangan mengubah instance class menjadi plain object.
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    return value
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      convertBigInt(item),
    ]),
  )
}

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const result = await query(args)
        return convertBigInt(result)
      },
    },
  },
})

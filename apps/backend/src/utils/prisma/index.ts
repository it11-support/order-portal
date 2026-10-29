import { PrismaClient } from '@/generated/prisma/client'
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

  if (Array.isArray(value)) {
    return value.map(convertBigInt)
  }

  if (value instanceof Date || value === null) {
    return value
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        convertBigInt(item),
      ]),
    )
  }

  return value
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
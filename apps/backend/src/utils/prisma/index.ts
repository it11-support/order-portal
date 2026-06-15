import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const basePrisma = new PrismaClient({ adapter })

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const result = await query(args)

        const convertBigInt = (obj: any): any => {
          if (obj === null || obj === undefined) return obj
          if (typeof obj === 'bigint') return obj.toString()
          if (Array.isArray(obj)) return obj.map(convertBigInt)
          if (typeof obj === 'object') {
            for (const key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                obj[key] = convertBigInt(obj[key])
              }
            }
          }
          return obj
        }

        return convertBigInt(result)
      },
    },
  },
})

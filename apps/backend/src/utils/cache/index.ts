import superjson from 'superjson'
import { redis } from '../redis'
import { Prisma } from '@/generated/prisma/client'

const pending = new Map<string, Promise<unknown>>()

superjson.registerCustom<Prisma.Decimal, string>(
  {
    isApplicable: (value): value is Prisma.Decimal =>
      Prisma.Decimal.isDecimal(value),

    serialize: (value) => value.toFixed(),

    deserialize: (value) => new Prisma.Decimal(value),
  },
  'prisma-decimal',
)

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (redis.status !== 'ready') return null

    try {
      const value = await redis.get(key)

      return value === null
        ? null
        : superjson.parse<T>(value)
    } catch (error) {
      console.error('[Cache] GET failed:', key, error)
      return null
    }
  },

  async set<T>(
    key: string,
    value: T,
    ttl = 300,
  ): Promise<void> {
    if (redis.status !== 'ready') return

    try {
      await redis.set(
        key,
        superjson.stringify(value),
        'EX',
        ttl,
      )
    } catch (error) {
      console.error('[Cache] SET failed:', key, error)
    }
  },

  async del(...keys: string[]): Promise<void> {
    if (redis.status !== 'ready' || !keys.length) return

    try {
      await redis.del(...keys)
    } catch (error) {
      console.error('[Cache] DEL failed:', error)
    }
  },

  async remember<T>(
    key: string,
    ttl: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key)

    if (cached !== null) return cached

    const existing = pending.get(key)

    if (existing) {
      return existing as Promise<T>
    }

    const promise = (async () => {
      const data = await fetcher()

      await this.set(key, data, ttl)

      return data
    })()

    pending.set(key, promise)

    try {
      return await promise
    } finally {
      pending.delete(key)
    }
  },
}
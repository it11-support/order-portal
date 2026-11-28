import Redis from 'ioredis'

export const redis = new Redis(
  process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
  {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 3000,
    commandTimeout: 2000,
    retryStrategy: (times) => Math.min(times * 500, 5000),
  },
)

redis.on('ready', () => {
  console.info('[Redis] Connected')
})

redis.on('error', (error) => {
  console.error('[Redis]', error.message)
})

export const connectRedis = async (): Promise<void> => {
  try {
    await redis.connect()
  } catch (error) {
    console.error('[Redis] Connection failed:', error)
  }
}

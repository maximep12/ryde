import { TypedRedis } from '@repo/redis'
import IORedis from 'ioredis'
import { env } from './env'

// Base Redis connection
export const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
})

// Export a singleton instance
export const typedRedis = new TypedRedis(connection)

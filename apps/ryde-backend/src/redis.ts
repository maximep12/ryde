import IORedis from 'ioredis'
import { env } from './lib/utils/env'

export const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
})

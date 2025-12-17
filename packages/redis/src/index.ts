import IORedis from 'ioredis'
import { z } from 'zod'

export class TypedRedis {
  constructor(private redis: IORedis) {}

  /**
   * Get a value from Redis and parse it with a Zod schema
   */
  async getTyped<T>(key: string, schema: z.ZodType<T>): Promise<T | null> {
    const data = await this.redis.get(key)
    if (!data) return null

    try {
      const parsed = JSON.parse(data)
      return schema.parse(parsed)
    } catch (error) {
      console.error(`Failed to parse Redis data for key ${key}:`, error)
      return null
    }
  }

  /**
   * Set a value in Redis with an optional expiration time
   */
  async setTyped<T>(key: string, value: T, expireSeconds?: number): Promise<'OK'> {
    const serialized = JSON.stringify(value)

    if (expireSeconds) {
      return this.redis.set(key, serialized, 'EX', expireSeconds)
    }

    return this.redis.set(key, serialized)
  }

  /**
   * Direct access to the underlying Redis client
   */
  get client(): IORedis {
    return this.redis
  }
}

import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { connection as redis } from '../redis'

type RateLimitOptions = {
  /** Max requests allowed within the window */
  max: number
  /** Window size in seconds */
  windowSeconds: number
  /** Redis key prefix */
  prefix: string
  /** Extract the key to rate-limit on (defaults to IP) */
  keyFn?: (c: { req: { header: (name: string) => string | undefined } }) => string
}

function getClientIp(c: { req: { header: (name: string) => string | undefined } }) {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export function rateLimiter({ max, windowSeconds, prefix, keyFn }: RateLimitOptions) {
  return createMiddleware(async (c, next) => {
    const identifier = keyFn ? keyFn(c) : getClientIp(c)
    const key = `rl:${prefix}:${identifier}`

    const current = await redis.incr(key)
    if (current === 1) {
      await redis.expire(key, windowSeconds)
    }

    c.header('X-RateLimit-Limit', String(max))
    c.header('X-RateLimit-Remaining', String(Math.max(0, max - current)))

    if (current > max) {
      throw new HTTPException(429, { message: 'Too many requests. Please try again later.' })
    }

    await next()
  })
}

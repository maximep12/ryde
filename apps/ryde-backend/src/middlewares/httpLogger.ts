import { createBaseLogger } from '@repo/logger'
import { createMiddleware } from 'hono/factory'
import { ContextVariables } from '../index'
import { formatHttpResponseLog, LOG_TYPES } from '../lib/utils/loggers'

const logger = createBaseLogger().child({ module: 'hono-http' })

export const httpLogger = createMiddleware<{ Variables: ContextVariables }>(async (c, next) => {
  const start = process.hrtime.bigint()
  c.set('requestStartTimeNanoSeconds', start)

  await next()

  const { url, method, raw, routePath, path } = c.req

  const end = process.hrtime.bigint()
  const responseTimeMs = (end - start) / BigInt(1000000)

  const status = c.res.status

  if (status < 400) {
    logger.info(
      formatHttpResponseLog({
        method,
        url,
        routePath,
        path,
        duration: responseTimeMs,
        status,
        requestBody: raw.body,
      }),
      LOG_TYPES.RESPONSE,
    )
  }
})

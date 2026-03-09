import { createBaseLogger } from '@repo/logger'
import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { formatHttpResponseLog, LOG_TYPES } from '../utils/loggers'

const logger = createBaseLogger().child({ module: 'error-handler' })

const attemptParseError = (err: Error, c: Context) => {
  if (err instanceof HTTPException) {
    const { message, status } = err

    if (err.status === 400) {
      const issues = c.get('issues')
      const details = c.get('details')

      if (issues && issues.length > 0) {
        return { message, status, issues }
      }

      if (details && details.length > 0) {
        return { message, status, details }
      }

      return { message, status }
    }

    return { message, status }
  }

  return null
}

export const errorHandler = async (err: Error | HTTPException, c: Context) => {
  const { url, method, raw, routePath, path } = c.req

  const end = process.hrtime.bigint()
  const responseTimeMs = (end - c.get('requestStartTimeNanoSeconds')) / BigInt(1000000)

  const parsedError = attemptParseError(err, c)
  const status = parsedError?.status || 500

  if (parsedError) {
    logger.error(
      formatHttpResponseLog({
        method,
        url,
        requestBody: raw.body,
        error: parsedError,
        status: parsedError.status,
        routePath,
        path,
        duration: responseTimeMs,
      }),
      LOG_TYPES.ERROR,
    )
    return c.json(parsedError, parsedError.status)
  }

  logger.error(
    formatHttpResponseLog({
      method,
      url,
      requestBody: raw.body,
      error: err,
      status,
      routePath,
      path,
      duration: responseTimeMs,
    }),
    LOG_TYPES.ERROR,
  )

  return c.json({ message: 'INTERNAL_ERROR' })
}

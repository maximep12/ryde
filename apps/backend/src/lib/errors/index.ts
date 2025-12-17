import { ENV, MESSAGE } from '@repo/constants'
import Sentry from '@repo/config-sentry/backend'
import { createBaseLogger } from '@repo/logger'
import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { env } from '../utils/env'
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

const captureSentryError = (err: Error, c: Context, status: number) => {
  try {
    const { url, method, path } = c.req
    const headers = c.req.header()

    const user = c.get('user')

    Sentry.withScope((scope) => {
      scope.setTag('method', method)
      scope.setTag('url', url)
      scope.setTag('path', path)
      scope.setTag('status', status.toString())

      if (user) {
        scope.setUser({
          id: user.id,
          email: user.email || '',
          givenName: user.givenName || '',
          familyName: user.familyName || '',
        })
      }

      scope.setContext('request', {
        method,
        url,
        path,
        headers,
      })

      Sentry.captureException(err)
    })
  } catch (sentryError) {
    logger.error({ error: sentryError }, 'Failed to capture error in Sentry')
  }
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

  // Capture error in Sentry for unexpected errors
  if (env.BACKEND_SENTRY_DSN && env.ENV !== ENV.LOCAL) {
    captureSentryError(err, c, status)
  }

  return c.json({ message: MESSAGE.INTERNAL_ERROR })
}

export type BackendQueryError = Awaited<ReturnType<typeof errorHandler>>

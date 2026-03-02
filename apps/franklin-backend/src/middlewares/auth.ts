import { MESSAGE, MILLIS } from '@repo/constants'
import { FEATURE_FLAGS_ENV } from '@repo/feature-flags'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { ContextVariables } from '../index'
import { env } from '../lib/utils/env'
import {
  extendSession,
  extractSessionTokenFromAuth,
  findSession,
  isSessionExpired,
} from '../routers/auth/helpers'
import { getUserFromSessionToken } from '../routers/users/helpers'

const featureFlags = FEATURE_FLAGS_ENV[env.ENV]

const GRACE_PERIOD = MILLIS.MINUTE * 2
const SLIDING_WINDOW_THRESHOLD = MILLIS.MINUTE * 30

export const verifySession = createMiddleware<{ Variables: ContextVariables }>(async (c, next) => {
  const authorization = c.req.header('Authorization')

  const sessionToken = authorization
    ? extractSessionTokenFromAuth(authorization)
    : c.req.query('sessionToken')

  if (!sessionToken) {
    if (!authorization) {
      throw new HTTPException(401, { message: MESSAGE.AUTH_HEADER_REQUIRED })
    }

    throw new HTTPException(401, { message: MESSAGE.AUTH_HEADER_PARSE_ERROR })
  }

  const sessionFound = await findSession(sessionToken)
  if (!sessionFound) {
    throw new HTTPException(401, { message: MESSAGE.SESSION_NOT_FOUND })
  }

  if (!featureFlags['infinite-user-sessions']) {
    const now = Date.now()
    const expiresAtMs = sessionFound.expiresAt.getTime()

    if (isSessionExpired(sessionFound) && now - expiresAtMs > GRACE_PERIOD) {
      throw new HTTPException(401, { message: MESSAGE.SESSION_EXPIRED })
    }

    const timeRemaining = expiresAtMs - now
    if (timeRemaining < SLIDING_WINDOW_THRESHOLD) {
      extendSession(sessionFound.sessionToken)
    }
  }

  c.set('session', sessionFound)
  await next()
})

export const attachUser = createMiddleware<{ Variables: ContextVariables }>(async (c, next) => {
  const { sessionToken } = c.get('session')

  const user = await getUserFromSessionToken(sessionToken)
  if (!user) throw new HTTPException(401, { message: MESSAGE.USER_NOT_FOUND })

  c.set('user', user)
  await next()
})

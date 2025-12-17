import { MESSAGE } from '@repo/constants'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { ContextVariables } from '../index'
import { extractSessionTokenFromAuth, findSession } from '../routers/auth/helpers'
import { getUserFromSessionToken } from '../routers/users/helpers'

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

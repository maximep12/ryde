import { MESSAGE, MILLIS } from '@repo/constants'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { zValidatorThrow } from '../../lib/errors/zValidatorThrow'
import { verifyPassword } from '../../lib/utils/crypto'
import { verifySession } from '../../middlewares/auth'
import {
  createUser,
  getUserByEmail as getUserFromUsersRouter,
  setPasswordAndActivate,
} from '../users/helpers'
import {
  createSession,
  deleteSession,
  extendSession,
  findSession,
  getSessionSchema,
  getUserByEmail,
  isSessionExpired,
  loginSchema,
} from './helpers'

const GRACE_PERIOD = MILLIS.MINUTE * 2
const SLIDING_WINDOW_THRESHOLD = MILLIS.MINUTE * 30

const authRouter = new Hono()

export const authRouterDefinition = authRouter

  /**
   * Authenticate user with email and password.
   * Creates a new session if credentials are valid.
   */
  .post('/callback', zValidatorThrow('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json')

    const user = await getUserByEmail(email)
    if (!user) {
      throw new HTTPException(401, { message: MESSAGE.INVALID_CREDENTIALS })
    }

    if (user.status === 'pending' && !user.passwordHash) {
      throw new HTTPException(403, { message: MESSAGE.USER_PENDING })
    }

    if (!user.passwordHash) {
      throw new HTTPException(401, { message: MESSAGE.INVALID_CREDENTIALS })
    }

    if (user.status !== 'active') {
      throw new HTTPException(401, { message: MESSAGE.USER_DISABLED })
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      throw new HTTPException(401, { message: MESSAGE.INVALID_CREDENTIALS })
    }

    const { sessionToken } = await createSession(user.id, '', '')

    return c.json({
      message: MESSAGE.SESSION_CREATED,
      sessionToken,
      user: {
        id: user.id,
        email: user.email,
        givenName: user.givenName,
        familyName: user.familyName,
      },
    })
  })

  /**
   * First-time join: pending user sets their password, account becomes active.
   */
  .post(
    '/join',
    zValidatorThrow('json', z.object({ email: z.string().email(), password: z.string().min(8) })),
    async (c) => {
      const { email, password } = c.req.valid('json')

      const user = await getUserFromUsersRouter(email)
      if (!user) throw new HTTPException(404, { message: MESSAGE.USER_NOT_FOUND })

      if (user.status !== 'pending') {
        throw new HTTPException(400, { message: MESSAGE.USER_NOT_PENDING })
      }

      const activatedUser = await setPasswordAndActivate(user.id, password)
      if (!activatedUser) throw new HTTPException(500, { message: MESSAGE.INTERNAL_ERROR })

      const { sessionToken } = await createSession(activatedUser.id, '', '')

      return c.json({
        message: MESSAGE.USER_JOINED,
        sessionToken,
        user: {
          id: activatedUser.id,
          email: activatedUser.email,
          givenName: activatedUser.givenName,
          familyName: activatedUser.familyName,
        },
      })
    },
  )

  /**
   * Public request access: creates a pending user with no password.
   */
  .post(
    '/request-access',
    zValidatorThrow(
      'json',
      z.object({
        email: z.string().email(),
        givenName: z.string().optional(),
        familyName: z.string().optional(),
      }),
    ),
    async (c) => {
      const { email, givenName, familyName } = c.req.valid('json')

      const existing = await getUserFromUsersRouter(email)
      if (existing) {
        throw new HTTPException(409, { message: MESSAGE.USER_ALREADY_EXISTS })
      }

      await createUser({ email, givenName, familyName, status: 'pending', role: 'trade_rep' })

      return c.json({ message: MESSAGE.ACCESS_REQUESTED }, 201)
    },
  )

  .post('/session/verify', zValidatorThrow('json', getSessionSchema), async (c) => {
    const { sessionToken } = c.req.valid('json')

    const sessionFound = await findSession(sessionToken)
    if (!sessionFound) throw new HTTPException(401, { message: MESSAGE.SESSION_NOT_FOUND })

    if (isSessionExpired(sessionFound)) {
      const now = Date.now()
      const expiredAgo = now - sessionFound.expiresAt.getTime()

      if (expiredAgo <= GRACE_PERIOD) {
        await extendSession(sessionFound.sessionToken)
        return new Response(null, { status: 204 })
      }

      throw new HTTPException(401, { message: MESSAGE.SESSION_EXPIRED })
    }

    const timeRemaining = sessionFound.expiresAt.getTime() - Date.now()
    if (timeRemaining < SLIDING_WINDOW_THRESHOLD) {
      extendSession(sessionFound.sessionToken)
    }

    return new Response(null, { status: 204 })
  })

  .post('/session/destroy', verifySession, async (c) => {
    const { sessionToken } = c.get('session')
    await deleteSession(sessionToken)

    return c.json({ message: MESSAGE.SESSION_DESTROYED })
  })

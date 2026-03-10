import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import jwt from 'jsonwebtoken'
import { zValidatorThrow } from '../../lib/errors/zValidatorThrow'
import { hashPassword, verifyPassword } from '../../lib/utils/crypto'
import { env } from '../../lib/utils/env'
import { verifyJWT } from '../../middlewares/auth'
import { ContextVariables } from '../../index'
import {
  countUsers,
  createUser,
  generateJWT,
  generateMetabaseDashboardLinks,
  getMetabaseUpdates,
  getUserByEmail,
  getUserById,
  resolveStaticToken,
} from './helpers'
import { loginSchema, requestAccessSchema, tokenSchema } from './schemas'

const authRouter = new Hono<{ Variables: ContextVariables }>()
const tokenRouter = new Hono<{ Variables: ContextVariables }>()

export const authRouterDefinition = authRouter

  /**
   * Request access — creates a pending user with email only.
   */
  .post('/request-access', zValidatorThrow('json', requestAccessSchema), async (c) => {
    const { email } = c.req.valid('json')

    const existing = await getUserByEmail(email)
    if (existing) {
      throw new HTTPException(409, { message: 'emailAlreadyExists' })
    }

    await createUser({ id: crypto.randomUUID(), email })

    return c.json({ message: 'accessRequested' }, 201)
  })

  /**
   * Login — verify bcrypt password and return signed JWT.
   * If this is the first user ever, create them as Admin automatically.
   */
  .post('/login', zValidatorThrow('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json')

    const userCount = await countUsers()

    let user = await getUserByEmail(email)

    let token: string

    if (userCount === 0) {
      // Bootstrap: first user becomes Admin
      const passwordHash = await hashPassword(password)
      user = await createUser({
        id: crypto.randomUUID(),
        email,
        passwordHash,
        role: 'admin',
      })
      token = generateJWT({ id: user.id, email: user.email, role: user.role ?? 'admin' })
    } else {
      if (!user) {
        throw new HTTPException(401, { message: 'invalidCredentials' })
      }

      if (user.passwordHash) {
        const valid = await verifyPassword(password, user.passwordHash)
        if (!valid) {
          throw new HTTPException(401, { message: 'invalidCredentials' })
        }
      }

      token = generateJWT({ id: user.id, email: user.email, role: user.role ?? '' })
    }

    const dates = await getMetabaseUpdates()
    const metabaseDashboardUrls = generateMetabaseDashboardLinks()

    return c.json({ token, user: { id: user.id, email: user.email, role: user.role }, dates, metabaseDashboardUrls })
  })

  /**
   * Me — return the authenticated user's info from JWT.
   */
  .get('/me', verifyJWT, async (c) => {
    const { id } = c.get('user')

    const user = await getUserById(id)
    if (!user) {
      throw new HTTPException(401, { message: 'userNotFound' })
    }

    const token = c.req.header('Authorization')?.replace('Bearer ', '') ?? ''
    const dates = await getMetabaseUpdates()
    const metabaseDashboardUrls = generateMetabaseDashboardLinks()

    return c.json({
      user: { id: user.id, email: user.email, role: user.role },
      token,
      dates,
      metabaseDashboardUrls,
    })
  })

export const tokenRouterDefinition = tokenRouter

  /**
   * Validate a token — accepts static config tokens or a valid JWT.
   * Returns a new signed JWT with the resolved role.
   */
  .post('/', zValidatorThrow('json', tokenSchema), async (c) => {
    const { data } = c.req.valid('json')
    const { token } = data

    // 1. Try static config tokens
    const staticRole = resolveStaticToken(token)
    if (staticRole) {
      const dates = await getMetabaseUpdates()
      const metabaseDashboardUrls = generateMetabaseDashboardLinks()
      const signedJwt = generateJWT({ id: '', email: '', role: staticRole })
      return c.json({ role: staticRole, jwt: signedJwt, metabaseDashboardUrls, updates: dates })
    }

    // 2. Try validating as a JWT
    let decoded: jwt.JwtPayload
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload
    } catch {
      throw new HTTPException(401, { message: 'Invalid token provided.' })
    }

    const role = decoded.role as string
    if (!role) {
      throw new HTTPException(401, { message: 'Invalid token provided.' })
    }

    const dates = await getMetabaseUpdates()
    const metabaseDashboardUrls = generateMetabaseDashboardLinks()
    const signedJwt = generateJWT({ id: decoded.id ?? '', email: decoded.email ?? '', role })

    return c.json({ role, jwt: signedJwt, metabaseDashboardUrls, updates: dates })
  })

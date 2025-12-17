import { MESSAGE } from '@repo/constants'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { verifySession } from '../../middlewares/auth'
import { deleteSession, findSession, getSessionSchema, isSessionExpired } from './helpers'

const authRouter = new Hono()

export const authRouterDefinition = authRouter
  .get('/config', async (c) => {
    // Placeholder - implement your auth provider config here
    return c.json({
      message: 'Auth configuration placeholder',
    })
  })

  .post('/session/verify', zValidator('json', getSessionSchema), async (c) => {
    const { sessionToken } = c.req.valid('json')

    const sessionFound = await findSession(sessionToken)
    if (!sessionFound) throw new HTTPException(401, { message: MESSAGE.SESSION_NOT_FOUND })

    if (isSessionExpired(sessionFound)) {
      throw new HTTPException(401, { message: MESSAGE.SESSION_EXPIRED })
    }

    return new Response(null, { status: 204 })
  })

  .post('/session/destroy', verifySession, async (c) => {
    const { sessionToken } = c.get('session')
    await deleteSession(sessionToken)

    return c.json({ message: MESSAGE.SESSION_DESTROYED })
  })

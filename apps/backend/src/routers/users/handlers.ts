import { MESSAGE } from '@repo/constants'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { ContextVariables } from '../../index'
import { zValidatorThrow } from '../../lib/errors/zValidatorThrow'
import { activateUser, disableUser, getUser, getUsers } from './helpers'
import { usersQueriesSchema } from './schemas'

const usersRouter = new Hono<{ Variables: ContextVariables }>()

export const usersRouterDefinition = usersRouter

  .get('/:userId', zValidatorThrow('param', z.object({ userId: z.string() })), async (c) => {
    const { userId } = c.req.valid('param')
    const user = await getUser(userId)

    if (!user) {
      throw new HTTPException(404, { message: MESSAGE.USER_NOT_FOUND })
    }

    return c.json(user)
  })

  .get('/', zValidatorThrow('query', usersQueriesSchema), async (c) => {
    const { page, pageSize } = c.req.valid('query')
    const users = await getUsers(page, pageSize)
    return c.json({ users })
  })

  .post('/activate', zValidatorThrow('json', z.object({ userId: z.string() })), async (c) => {
    const { userId } = c.req.valid('json')

    const targetUser = await getUser(userId)
    if (!targetUser) throw new HTTPException(404, { message: MESSAGE.USER_NOT_FOUND })
    if (targetUser.isActive) {
      throw new HTTPException(400, { message: MESSAGE.USER_ALREADY_ACTIVE })
    }

    await activateUser(userId)

    return c.json({ message: MESSAGE.USER_ACTIVATED })
  })

  .post('/disable', zValidatorThrow('json', z.object({ userId: z.string() })), async (c) => {
    const { userId } = c.req.valid('json')

    const targetUser = await getUser(userId)
    if (!targetUser) throw new HTTPException(404, { message: MESSAGE.USER_NOT_FOUND })
    if (!targetUser.isActive) {
      throw new HTTPException(400, { message: MESSAGE.USER_ALREADY_DISABLED })
    }

    await disableUser(userId)

    return c.json({ message: MESSAGE.USER_DISABLED })
  })

  .post('/me', async (c) => {
    const user = c.get('user')
    if (!user) throw new HTTPException(401, { message: MESSAGE.USER_NO_SESSION })
    return c.json(user)
  })

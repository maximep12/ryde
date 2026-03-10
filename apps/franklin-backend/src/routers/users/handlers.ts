import { MESSAGE } from '@repo/constants'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { ContextVariables } from '../../index'
import { zValidatorThrow } from '../../lib/errors/zValidatorThrow'
import {
  activateUser,
  createUser,
  disableUser,
  getUser,
  getUserByEmail,
  getUsers,
  updateUser,
} from './helpers'
import { createUserSchema, upsertUserSchema, usersQueriesSchema } from './schemas'

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
    const query = c.req.valid('query')
    const result = await getUsers(query)
    return c.json({ users: result.items, pagination: result.pagination })
  })

  .post('/activate', zValidatorThrow('json', z.object({ userId: z.string() })), async (c) => {
    const { userId } = c.req.valid('json')

    const targetUser = await getUser(userId)
    if (!targetUser) throw new HTTPException(404, { message: MESSAGE.USER_NOT_FOUND })
    if (targetUser.status === 'active') {
      throw new HTTPException(400, { message: MESSAGE.USER_ALREADY_ACTIVE })
    }

    await activateUser(userId)

    return c.json({ message: MESSAGE.USER_ACTIVATED })
  })

  .post('/disable', zValidatorThrow('json', z.object({ userId: z.string() })), async (c) => {
    const { userId } = c.req.valid('json')
    const currentUser = c.get('user')

    if (userId === currentUser.id) {
      throw new HTTPException(400, { message: MESSAGE.USER_CANNOT_DISABLE_SELF })
    }

    const targetUser = await getUser(userId)
    if (!targetUser) throw new HTTPException(404, { message: MESSAGE.USER_NOT_FOUND })
    if (targetUser.status === 'inactive') {
      throw new HTTPException(400, { message: MESSAGE.USER_ALREADY_DISABLED })
    }

    await disableUser(userId)

    return c.json({ message: MESSAGE.USER_DISABLED })
  })

  .post('/', zValidatorThrow('json', createUserSchema), async (c) => {
    const body = c.req.valid('json')

    const existing = await getUserByEmail(body.email)
    if (existing) {
      throw new HTTPException(409, { message: MESSAGE.USER_ALREADY_EXISTS })
    }

    const user = await createUser(body)
    if (!user) {
      throw new HTTPException(500, { message: MESSAGE.INTERNAL_ERROR })
    }

    return c.json(user, 201)
  })

  .patch(
    '/:userId',
    zValidatorThrow('param', z.object({ userId: z.string() })),
    zValidatorThrow('json', upsertUserSchema.omit({ id: true })),
    async (c) => {
      const { userId } = c.req.valid('param')
      const body = c.req.valid('json')

      const existing = await getUser(userId)
      if (!existing) throw new HTTPException(404, { message: MESSAGE.USER_NOT_FOUND })

      const updated = await updateUser({ id: userId, ...body })
      return c.json(updated)
    },
  )

  .post('/me', async (c) => {
    const user = c.get('user')
    if (!user) throw new HTTPException(401, { message: MESSAGE.USER_NO_SESSION })
    return c.json(user)
  })

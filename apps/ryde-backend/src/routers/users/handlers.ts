import { type Role } from '@repo/db'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { zValidatorThrow } from '../../lib/errors/zValidatorThrow'
import { sendAccessApprovedEmail } from '../../lib/email'
import { env } from '../../lib/utils/env'
import { requireRoles, verifyJWT } from '../../middlewares/auth'
import { ContextVariables } from '../../index'
import {
  createNewUser,
  deleteUsers,
  getUser,
  getUsers,
  getUsersByIds,
  listUsers,
  setUsersRole,
  updateUser,
} from './helpers'
import { batchUpdateSchema, createUserSchema, upsertUserSchema, usersQueriesSchema } from './schemas'

const usersRouter = new Hono<{ Variables: ContextVariables }>()

export const usersRouterDefinition = usersRouter

  /**
   * List all users with pagination, search, and status filters.
   */
  .get('/', verifyJWT, zValidatorThrow('query', usersQueriesSchema), async (c) => {
    const query = c.req.valid('query')
    const result = await getUsers(query)
    return c.json({ users: result.items, pagination: result.pagination })
  })

  /**
   * Get a single user by ID.
   */
  .get('/:userId', verifyJWT, zValidatorThrow('param', z.object({ userId: z.string() })), async (c) => {
    const { userId } = c.req.valid('param')
    const user = await getUser(userId)
    if (!user) throw new HTTPException(404, { message: 'User not found.' })
    return c.json(user)
  })

  /**
   * Create a new user (admin only).
   */
  .post('/', verifyJWT, requireRoles('admin'), zValidatorThrow('json', createUserSchema), async (c) => {
    const body = c.req.valid('json')

    const { getUserByEmail } = await import('../auth/helpers')
    const existing = await getUserByEmail(body.email)
    if (existing) throw new HTTPException(409, { message: 'User already exists.' })

    const user = await createNewUser(body)
    if (!user) throw new HTTPException(500, { message: 'Failed to create user.' })

    return c.json(user, 201)
  })

  /**
   * Batch update user roles.
   * Body: { [roleName]: string[] } — use "Deleted" to remove users.
   */
  .patch('/batch', verifyJWT, requireRoles('admin'), zValidatorThrow('json', batchUpdateSchema), async (c) => {
    const updates = c.req.valid('json')

    // Collect IDs of users being assigned a role (not deleted)
    const approvedUserIds = Object.entries(updates)
      .filter(([roleName]) => roleName !== 'Deleted')
      .flatMap(([, userIds]) => userIds)

    // Check which of those users are currently pending before the update
    const pendingUsers =
      approvedUserIds.length > 0 ? (await getUsersByIds(approvedUserIds)).filter((u) => u.status === 'pending') : []

    await Promise.all(
      Object.entries(updates).map(([roleName, userIds]) => {
        if (roleName === 'Deleted') return deleteUsers(userIds)
        return setUsersRole(userIds, roleName as Role)
      }),
    )

    // Fire-and-forget approval emails for newly approved pending users
    for (const user of pendingUsers) {
      const joinLink = `${env.FRANKLIN_FRONTEND_URL}/join?email=${encodeURIComponent(user.email)}`
      void sendAccessApprovedEmail({ to: user.email, joinLink })
    }

    const result = await listUsers()
    return c.json(result)
  })

  /**
   * Update a single user (admin only).
   */
  .patch(
    '/:userId',
    verifyJWT,
    requireRoles('admin'),
    zValidatorThrow('param', z.object({ userId: z.string() })),
    zValidatorThrow('json', upsertUserSchema),
    async (c) => {
      const { userId } = c.req.valid('param')
      const body = c.req.valid('json')

      const existing = await getUser(userId)
      if (!existing) throw new HTTPException(404, { message: 'User not found.' })

      // If status is changing from pending to active, send approval email
      const wasActivated = existing.status === 'pending' && body.status === 'active'

      const updated = await updateUser(userId, body)

      if (wasActivated && updated) {
        const joinLink = `${env.FRANKLIN_FRONTEND_URL}/join?email=${encodeURIComponent(updated.email)}`
        void sendAccessApprovedEmail({ to: updated.email, joinLink })
      }

      return c.json(updated)
    },
  )

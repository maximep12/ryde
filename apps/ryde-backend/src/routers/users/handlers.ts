import { Hono } from 'hono'
import { zValidatorThrow } from '../../lib/errors/zValidatorThrow'
import { requireRoles, verifyJWT } from '../../middlewares/auth'
import { ContextVariables } from '../../index'
import { deleteUsers, listUsers, setUsersRole } from './helpers'
import { batchUpdateSchema } from './schemas'

const usersRouter = new Hono<{ Variables: ContextVariables }>()

export const usersRouterDefinition = usersRouter

  /**
   * List all users (pending first, then alphabetical).
   */
  .get('/', verifyJWT, async (c) => {
    const result = await listUsers()
    return c.json(result)
  })

  /**
   * Batch update user roles.
   * Body: { [roleName]: string[] } — use "Deleted" to remove users.
   */
  .patch('/batch', verifyJWT, requireRoles('admin'), zValidatorThrow('json', batchUpdateSchema), async (c) => {
    const updates = c.req.valid('json')

    await Promise.all(
      Object.entries(updates).map(([roleName, userIds]) => {
        if (roleName === 'Deleted') return deleteUsers(userIds)
        return setUsersRole(userIds, roleName)
      }),
    )

    const result = await listUsers()
    return c.json(result)
  })

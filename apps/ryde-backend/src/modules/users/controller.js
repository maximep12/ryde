import User from 'models/user'
import UserRole from 'models/userRole'

export async function getUsers(ctx) {
  const users = await User.query()
    .select()
    .orderByRaw('(token IS NOT NULL AND password_hash IS NULL) DESC')
    .withGraphFetched('role')

  ctx.body = users.map(({ token, password, ...u }) => u)
}

export async function updateUsers(ctx) {
  const updates = ctx.request.body

  await Promise.all(
    Object.entries(updates).map(async ([roleName, userIds]) => {
      if (roleName === 'Deleted') {
        await User.query().whereIn('id', userIds).delete()
        return
      }
      const role = await UserRole.query().select('id').where('role', roleName).first()
      if (!role) return
      await User.query().whereIn('id', userIds).patch({ role_id: role.id })
    }),
  )

  const users = await User.query()
    .select()
    .orderByRaw('(token IS NOT NULL AND password_hash IS NULL) DESC')
    .withGraphFetched('role')

  ctx.body = users.map(({ token, password, ...u }) => u)
}

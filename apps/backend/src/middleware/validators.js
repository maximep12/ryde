import User from 'models/user'
import { verify } from 'jsonwebtoken'
import config from 'config'

export async function isAuthenticated(ctx, next) {
  const { authorization } = ctx.headers
  if (!authorization) return ctx.throw(401)

  try {
    const { id } = verify(authorization.replace('Bearer ', ''), config.jwtSecret)

    const user = await User.query().where({ id }).first()

    ctx.user = user
  } catch (err) {
    ctx.throw(401, err.message)
  }

  return next()
}

import config from 'config'
import jwt from 'jsonwebtoken'
import User from 'models/user'
import { APP_ROLES } from 'utils/constants'
import { generateMetabaseDashboardLinks, getMetabaseUpdates } from './helpers'

const USER_ROLE_TO_APP_ROLE = {
  Admin: APP_ROLES.admin,
  Trade: APP_ROLES.trade,
  'Data manager': APP_ROLES.trade,
}

async function resolveRole(token) {
  // 1. Check static config tokens
  const staticRole = Object.keys(config.tokens).find((key) => config.tokens[key] === token)
  if (staticRole) return staticRole

  // 2. Check users table for magic link tokens
  const user = await User.query().findOne({ token }).joinRelated('role').select('users.*', 'role.role as roleName')

  if (!user) return APP_ROLES.unauthorized

  // Clear the token after use (single-use)
  await User.query().findById(user.id).patch({ token: null })

  return USER_ROLE_TO_APP_ROLE[user.roleName] || APP_ROLES.unauthorized
}

export async function validateToken(ctx) {
  const token = ctx.request.body.data.token

  const role = await resolveRole(token)

  if (role === APP_ROLES.unauthorized) {
    return ctx.throw(401, 'Invalid token provided.')
  }

  if (role === APP_ROLES.rabba) {
    const signedJwt = jwt.sign({ role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
    return (ctx.body = { role, jwt: signedJwt })
  }

  const dates = await getMetabaseUpdates()

  const metabaseDashboardUrls = generateMetabaseDashboardLinks({ role })

  const signedJwt = jwt.sign({ role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })

  ctx.body = {
    role,
    jwt: signedJwt,
    metabaseDashboardUrls,
    updates: dates,
  }
}

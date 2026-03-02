import jwt from 'jsonwebtoken'
import config from 'config'
import User from 'models/user'
import { generateMetabaseDashboardLinks, getMetabaseUpdates } from '../token/helpers'

export async function getMe(ctx) {
  const token = ctx.headers.authorization?.replace('Bearer ', '')
  if (!token) ctx.throw(401, 'Missing authorization token.')

  const decoded = jwt.verify(token, config.jwtSecret)
  const user = await User.query().findById(decoded.id).withGraphFetched('role')
  if (!user) ctx.throw(401, 'userNotFound')

  const role = user.role?.role?.toLowerCase()

  const dates = await getMetabaseUpdates()
  const metabaseDashboardUrls = generateMetabaseDashboardLinks({ role })

  ctx.body = { user, token, dates, metabaseDashboardUrls }
}

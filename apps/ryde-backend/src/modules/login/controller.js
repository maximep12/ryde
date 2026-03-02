import User from 'models/user'
import UserRole from 'models/userRole'
import { generateMetabaseDashboardLinks, getMetabaseUpdates } from '../token/helpers'

// Step 1: User submits their email to request access
export async function requestAccess(ctx) {
  const { email } = ctx.request.body

  try {
    await User.query().insert({ email })
    ctx.status = 201
    ctx.body = { message: 'accessRequested' }
  } catch (err) {
    switch (err.code) {
      case '23505':
        ctx.throw(409, 'emailAlreadyExists')
        break
      default:
        ctx.throw(422, err.message || 'defaultError')
    }
  }
}

// Step 2: User logs in with email + password
export async function login(ctx) {
  const { email, password } = ctx.request.body

  const userCount = await User.query().resultSize()

  let user = await User.query().findOne({ email }).withGraphFetched('role')

  let token
  if (userCount === 0) {
    const adminRole = await UserRole.query().select('id').where('role', 'Admin').first()
    user = await User.query().insertAndFetch({ email, role_id: adminRole.id }).withGraphFetched('role')

    user.passwordHash = password
    await user.hashPassword()

    token = user.generateToken()
    await User.query().findById(user.id).patch({ password_hash: user.passwordHash, token })
  } else {
    if (!user) ctx.throw(401, 'invalidCredentials')

    if (user.passwordHash) {
      const valid = await user.validatePassword(password)
      if (!valid) ctx.throw(401, 'invalidCredentials')
      token = user.generateToken()
    } else {
      token = user.generateToken()
      await User.query().findById(user.id).patch({ token })
    }
  }

  const dates = await getMetabaseUpdates()
  const metabaseDashboardUrls = generateMetabaseDashboardLinks({ role: user.role })

  console.log({ token, user, dates, metabaseDashboardUrls })

  ctx.body = { token, user, dates, metabaseDashboardUrls }
}

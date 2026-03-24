import jwt from 'jsonwebtoken'
import config from 'config'

function requireRoles(...roles) {
  return async function (ctx, next) {
    const authHeader = ctx.headers.authorization
    if (!authHeader) {
      return ctx.throw(401, 'Missing authorization token.')
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

    let decoded
    try {
      decoded = jwt.verify(token, config.jwtSecret)
    } catch (err) {
      return ctx.throw(401, 'Invalid or expired token.')
    }

    if (!roles.includes(decoded.role)) {
      return ctx.throw(403, 'Insufficient permissions.')
    }

    ctx.state.user = { role: decoded.role }
    return await next()
  }
}

export const tokenIsValid = requireRoles('Admin')
export const canUploadRabba = requireRoles('Admin', 'rabba')
export const canUploadCircleK = requireRoles('Admin', 'circle k')
export const canUploadCentralMarket = requireRoles('Admin', 'central market')
export const canUploadLoblaws = requireRoles('Admin')
export const canUploadParkland = requireRoles('Admin')
export const canUploadPetroCanada = requireRoles('Admin')
export const canUpload7Eleven = requireRoles('Admin')
export const canUploadNapOrange = requireRoles('Admin')
export const canUploadSobeys = requireRoles('Admin')

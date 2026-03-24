import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import jwt from 'jsonwebtoken'
import { ContextVariables } from '../index'
import { env } from '../lib/utils/env'

export const verifyJWT = createMiddleware<{ Variables: ContextVariables }>(async (c, next) => {
  const authorization = c.req.header('Authorization')

  if (!authorization) {
    throw new HTTPException(401, { message: 'Missing authorization token.' })
  }

  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization

  let decoded: jwt.JwtPayload
  try {
    decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload
  } catch {
    throw new HTTPException(401, { message: 'Invalid or expired token.' })
  }

  c.set('user', { id: decoded.id, email: decoded.email, role: decoded.role })
  await next()
})

export const requireRoles = (...roles: string[]) =>
  createMiddleware<{ Variables: ContextVariables }>(async (c, next) => {
    const authorization = c.req.header('Authorization')

    if (!authorization) {
      throw new HTTPException(401, { message: 'Missing authorization token.' })
    }

    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization

    let decoded: jwt.JwtPayload
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload
    } catch {
      throw new HTTPException(401, { message: 'Invalid or expired token.' })
    }

    if (!roles.includes(decoded.role)) {
      throw new HTTPException(403, { message: 'Insufficient permissions.' })
    }

    c.set('user', { id: decoded.id, email: decoded.email, role: decoded.role })
    await next()
  })

// Pre-built guards (matching old apps/backend/src/utils/handlers.js)
export const tokenIsValid = requireRoles('admin')
export const canUploadRabba = requireRoles('admin', 'rabba')
export const canUploadCircleK = requireRoles('admin', 'circle k')
export const canUploadCentralMarket = requireRoles('admin', 'central market')
export const canUploadNapOrange = requireRoles('admin')
export const canUploadSobeys = requireRoles('admin')
export const canUploadLoblaws = requireRoles('admin')
export const canUploadParkland = requireRoles('admin')
export const canUploadPetroCanada = requireRoles('admin')
export const canUpload7Eleven = requireRoles('admin')
export const canUploadBgFuels = requireRoles('admin')

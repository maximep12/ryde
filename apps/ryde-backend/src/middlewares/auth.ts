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

// Pre-built guards (matching old apps/ryde-backend/src/utils/handlers.js)
export const tokenIsValid = requireRoles('Admin')
export const canUploadRabba = requireRoles('Admin', 'rabba')
export const canUploadCircleK = requireRoles('Admin', 'circle k')
export const canUploadCentralMarket = requireRoles('Admin', 'central market')
export const canUploadNapOrange = requireRoles('Admin')
export const canUploadSobeys = requireRoles('Admin')
export const canUploadLoblaws = requireRoles('Admin')
export const canUploadParkland = requireRoles('Admin')
export const canUploadPetroCanada = requireRoles('Admin')
export const canUpload7Eleven = requireRoles('Admin')

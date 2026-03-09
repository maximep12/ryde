import { serve } from '@hono/node-server'
import { createBaseLogger } from '@repo/logger'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { errorHandler } from './lib/errors'
import { httpLogger } from './middlewares/httpLogger'
import { authRouterDefinition, tokenRouterDefinition } from './routers/auth/handlers'

export type RequestUser = {
  id: string
  email: string
  role: string
}

export type ContextVariables = {
  user: RequestUser
  issues: z.ZodIssue[]
  details: unknown
  requestStartTimeNanoSeconds: bigint
}

const app = new Hono<{ Variables: ContextVariables }>()

const appDefinition = app
  .use(
    cors({
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      allowHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    }),
  )
  .use(httpLogger)
  .get('/healthz', async (c) => c.text('OK'))
  .route('/auth', authRouterDefinition)
  .route('/token', tokenRouterDefinition)
  .onError(errorHandler)

export type AppType = typeof appDefinition

const port = 5001

const logger = createBaseLogger().child({
  module: 'ryde-backend',
})

logger.info({ url: `http://localhost:${port}` }, 'Server is running')

serve({
  fetch: app.fetch,
  port,
})

import { serve } from '@hono/node-server'
import { usersSessions } from '@repo/db'
import { createBaseLogger } from '@repo/logger'
import { InferSelectModel } from 'drizzle-orm'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { errorHandler } from './lib/errors'
import { timeoutHandler } from './lib/utils/timeoutHandler'
import { attachUser, verifySession } from './middlewares/auth'
import { httpLogger } from './middlewares/httpLogger'
import { authRouterDefinition } from './routers/auth/handlers'
import { exampleRouterDefinition } from './routers/example/handlers'
import { usersRouterDefinition } from './routers/users/handlers'

export type RequestUser = {
  id: string
  email: string
  givenName: string | null
  familyName: string | null
}

export type ContextVariables = {
  user: RequestUser
  session: InferSelectModel<typeof usersSessions>
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
  .get('/', timeoutHandler(1000 * 60 * 60 * 24))
  .get('/healthz', async (c) => c.text('OK'))
  .route('/auth', authRouterDefinition)
  .use(verifySession)
  .use(attachUser)
  .route('/users', usersRouterDefinition)
  .route('/example', exampleRouterDefinition)
  .onError(errorHandler)

export type AppType = typeof appDefinition

const port = 5000

const logger = createBaseLogger().child({
  module: 'backend',
})

logger.info({ url: `http://localhost:${port}` }, 'Server is running')

serve({
  fetch: app.fetch,
  port,
})

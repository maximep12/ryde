import { serve } from '@hono/node-server'
import { createBaseLogger } from '@repo/logger'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { errorHandler } from './lib/errors'
import { env } from './lib/utils/env'
import { httpLogger } from './middlewares/httpLogger'
import { bannersRouterDefinition } from './routers/banners/handlers'
import { authRouterDefinition, tokenRouterDefinition } from './routers/auth/handlers'
import { customersRouterDefinition } from './routers/customers/handlers'
import { productsRouterDefinition } from './routers/products/handlers'
import { amazonOrdersRouterDefinition } from './routers/amazonOrders/handlers'
import { customerProductStatusRouterDefinition } from './routers/customerProductStatus/handlers'
import { filesRouterDefinition } from './routers/files/handlers'
import { forecastRouterDefinition } from './routers/forecast/handlers'
import { sellinOrdersRouterDefinition } from './routers/sellinOrders/handlers'
import { sellinOrdersConfirmedRouterDefinition } from './routers/sellinOrdersConfirmed/handlers'
import { uploadDataDefinition } from './routers/upload'
import { usersRouterDefinition } from './routers/users/handlers'
import { workersRouterDefinition } from './routers/workers/handlers'

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
      origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
      allowHeaders: ['Content-Type', 'Authorization', 'Content-Disposition'],
      credentials: true,
    }),
  )
  .use(httpLogger)
  .get('/healthz', async (c) => c.text('OK'))
  .route('/auth', authRouterDefinition)
  .route('/token', tokenRouterDefinition)
  .route('/users', usersRouterDefinition)
  .route('/customers', customersRouterDefinition)
  .route('/products', productsRouterDefinition)
  .route('/sellin-orders', sellinOrdersRouterDefinition)
  .route('/sellin-orders-confirmed', sellinOrdersConfirmedRouterDefinition)
  .route('/amazon-orders', amazonOrdersRouterDefinition)
  .route('/forecast', forecastRouterDefinition)
  .route('/customerProductStatus', customerProductStatusRouterDefinition)
  .route('/download', filesRouterDefinition)
  .route('/banners', bannersRouterDefinition)
  .route('/workers', workersRouterDefinition)
  .route('/upload', uploadDataDefinition)
  .onError(errorHandler)

export type AppType = typeof appDefinition

const port = env.PORT

const logger = createBaseLogger().child({
  module: 'backend',
})

logger.info({ url: `http://localhost:${port}` }, 'Server is running')

serve({
  fetch: app.fetch,
  port,
})

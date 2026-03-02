import { Hono } from 'hono'
import { ContextVariables } from '../../index'
import { zValidatorThrow } from '../../lib/errors/zValidatorThrow'
import { getProducts } from './helpers'
import { productsQuerySchema } from './schemas'

const productsRouter = new Hono<{ Variables: ContextVariables }>()

export const productsRouterDefinition = productsRouter

  /**
   * GET /products
   * List all products with pagination and optional filters
   */
  .get('/', zValidatorThrow('query', productsQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const result = await getProducts(query)
    return c.json(result)
  })

import { Hono } from 'hono'
import { ContextVariables } from '../../index'
import { zValidatorThrow } from '../../lib/errors/zValidatorThrow'
import { getOneLineSd, getOneLineSdFilterOptions } from './helpers'
import { oneLineSdQuerySchema } from './schemas'

const oneLineSdRouter = new Hono<{ Variables: ContextVariables }>()

export const oneLineSdRouterDefinition = oneLineSdRouter

  /**
   * GET /one-line-sd
   * List all one-line S&D records with pagination and optional filters
   */
  .get('/', zValidatorThrow('query', oneLineSdQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const result = await getOneLineSd(query)
    return c.json(result)
  })

  /**
   * GET /one-line-sd/filter-options
   * Get available filter options for plant names, material groups, and purchasing groups
   */
  .get('/filter-options', async (c) => {
    const result = await getOneLineSdFilterOptions()
    return c.json(result)
  })

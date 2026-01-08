import { Hono } from 'hono'
import { ContextVariables } from '../../index'
import { zValidatorThrow } from '../../lib/errors/zValidatorThrow'
import { getInventory, getInventoryFilterOptions } from './helpers'
import { inventoryQuerySchema } from './schemas'

const inventoryRouter = new Hono<{ Variables: ContextVariables }>()

export const inventoryRouterDefinition = inventoryRouter

  /**
   * GET /inventory
   * List all inventory with pagination and optional filters
   */
  .get('/', zValidatorThrow('query', inventoryQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const result = await getInventory(query)
    return c.json(result)
  })

  /**
   * GET /inventory/filter-options
   * Get available filter options for plant, storage location, and base unit
   */
  .get('/filter-options', async (c) => {
    const result = await getInventoryFilterOptions()
    return c.json(result)
  })

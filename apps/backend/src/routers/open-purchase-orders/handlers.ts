import { Hono } from 'hono'
import { ContextVariables } from '../../index'
import { zValidatorThrow } from '../../lib/errors/zValidatorThrow'
import { getOpenPurchaseOrders, getOpenPurchaseOrdersFilterOptions } from './helpers'
import { openPurchaseOrdersQuerySchema } from './schemas'

const openPurchaseOrdersRouter = new Hono<{ Variables: ContextVariables }>()

export const openPurchaseOrdersRouterDefinition = openPurchaseOrdersRouter

  /**
   * GET /open-purchase-orders
   * List all open purchase orders with pagination and optional filters
   */
  .get('/', zValidatorThrow('query', openPurchaseOrdersQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const result = await getOpenPurchaseOrders(query)
    return c.json(result)
  })

  /**
   * GET /open-purchase-orders/filter-options
   * Get available filter options for plant, order type, and supplier
   */
  .get('/filter-options', async (c) => {
    const result = await getOpenPurchaseOrdersFilterOptions()
    return c.json(result)
  })

import { Hono } from 'hono'
import { ContextVariables } from '../../index'
import { zValidatorThrow } from '../../lib/errors/zValidatorThrow'
import { getForecasts, getForecastsFilterOptions } from './helpers'
import { forecastsQuerySchema } from './schemas'

const forecastsRouter = new Hono<{ Variables: ContextVariables }>()

export const forecastsRouterDefinition = forecastsRouter

  /**
   * GET /forecasts
   * List all forecasts with pagination and optional filters
   */
  .get('/', zValidatorThrow('query', forecastsQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const result = await getForecasts(query)
    return c.json(result)
  })

  /**
   * GET /forecasts/filter-options
   * Get available filter options for country, brand, plant, year, month
   */
  .get('/filter-options', async (c) => {
    const result = await getForecastsFilterOptions()
    return c.json(result)
  })

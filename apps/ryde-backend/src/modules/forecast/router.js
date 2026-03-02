import Router from '@koa/router'
import { tokenIsValid } from 'utils/handlers'
import * as forecast from './controller'

const router = new Router({ prefix: '/forecast' })

router.post('/amazon', tokenIsValid, forecast.importAmazonForecast)

export default router

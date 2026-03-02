import Router from '@koa/router'
import * as sellinOrders from './controller'
import { tokenIsValid } from 'utils/handlers'

const router = new Router({ prefix: '/sellin-orders' })

router.post('/file', tokenIsValid, sellinOrders.saveSellinData)

export default router

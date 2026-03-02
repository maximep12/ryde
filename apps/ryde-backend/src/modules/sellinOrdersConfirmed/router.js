import Router from '@koa/router'
import * as sellinOrders from './controller'
import { tokenIsValid } from 'utils/handlers'

const router = new Router({ prefix: '/sellin-orders-confirmed' })

router.post('/file/7-eleven', tokenIsValid, sellinOrders.save7ElevenConfirmedData)
router.post('/file', tokenIsValid, sellinOrders.saveSellinConfirmedData)

export default router

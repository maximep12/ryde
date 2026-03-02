import Router from '@koa/router'
import * as amazonOrders from './controller'
import { tokenIsValid } from 'utils/handlers'

const router = new Router({ prefix: '/amazon-orders' })

router.post('/file', tokenIsValid, amazonOrders.saveAmazonFile)
router.post('/bundles', tokenIsValid, amazonOrders.saveAmazonBundlesFile)

export default router

import Router from '@koa/router'
import { tokenIsValid } from 'utils/handlers'
import * as customerProductStatus from './controller'

const router = new Router({ prefix: '/customerProductStatus' })

router.post('/', tokenIsValid, customerProductStatus.importCustomerProductsStatus)

export default router

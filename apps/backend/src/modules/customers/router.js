import Router from '@koa/router'
import * as customer from './controller'
import { tokenIsValid } from 'utils/handlers'

const router = new Router({ prefix: '/customers' })

router.post('/targets', tokenIsValid, customer.updateCustomerTargets)
router.post('/', tokenIsValid, customer.updateCustomerSchema)

export default router

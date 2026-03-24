import Router from '@koa/router'
import * as product from './controller'
import { tokenIsValid } from 'utils/handlers'

const router = new Router({ prefix: '/products' })

router.post('/', tokenIsValid, product.createFromCsv)
router.post('/formats', tokenIsValid, product.createFormatsFromCsv)

export default router

import Router from '@koa/router'
// import { isAuthenticated } from 'middleware/validators'
import * as users from './controller'

const router = new Router({ prefix: '/users' })

router.patch('/batch', users.updateUsers)
router.get('/', users.getUsers)

export default router

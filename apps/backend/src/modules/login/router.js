import Router from '@koa/router'
// import { isAuthenticated, isAdmin } from 'middleware/validators'
import * as login from './controller'

const router = new Router({ prefix: '/auth' })

router.post('/request-access', login.requestAccess)
router.post('/login', login.login)

export default router

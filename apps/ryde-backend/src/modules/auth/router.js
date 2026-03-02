import Router from '@koa/router'
import * as auth from './controller'

const router = new Router({ prefix: '/auth' })

router.get('/me', auth.getMe)

export default router

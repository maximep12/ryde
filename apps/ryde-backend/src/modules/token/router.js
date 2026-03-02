import Router from '@koa/router'
import * as tokens from './controller'

const router = new Router({ prefix: '/token' })

router.post('/', tokens.validateToken)

export default router

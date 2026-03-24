import Router from '@koa/router'
import * as files from './controller'
import { tokenIsValid } from 'utils/handlers'

const router = new Router({ prefix: '/workers' })

router.get('/rabba/:container', tokenIsValid, files.runRabbaWorker)

export default router

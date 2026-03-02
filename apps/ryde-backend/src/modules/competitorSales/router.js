import Router from '@koa/router'
import * as competitorSales from './controller'
import { canUploadRabba } from 'utils/handlers'

const router = new Router({ prefix: '/competitors' })

router.post('/rabba', canUploadRabba, competitorSales.importRabbaCompetitorsSales)

export default router

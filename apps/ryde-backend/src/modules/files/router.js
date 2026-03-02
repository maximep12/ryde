import Router from '@koa/router'
import * as files from './controller'
import { tokenIsValid } from 'utils/handlers'

const router = new Router({ prefix: '/download' })

router.get('/circleK', tokenIsValid, files.downloadLastCircleK)
router.get('/rabba/:container', tokenIsValid, files.downloadLastRabba)
router.get('/list', tokenIsValid, files.getLatestStoredFiles)
router.get('/period-targets', tokenIsValid, files.getPeriodTargetsFile)
router.get('/:banner/:provider/:fileName', tokenIsValid, files.downloadBannerReport)

export default router

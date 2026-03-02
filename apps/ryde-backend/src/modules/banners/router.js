import Router from '@koa/router'
import {
  canUploadCentralMarket,
  canUploadLoblaws,
  canUploadCircleK,
  canUploadRabba,
  canUploadParkland,
  canUploadPetroCanada,
  canUpload7Eleven,
  canUploadNapOrange,
  canUploadSobeys,
} from 'utils/handlers'
import * as banners from './controller'

const router = new Router({ prefix: '/banners' })

router.post('/rabba', canUploadRabba, banners.importRabbaSales)
router.post('/circleK', canUploadCircleK, banners.importCircleKSales)
router.post('/circleK/qcatl', canUploadCircleK, banners.importCircleKQcAtlSales)
router.post('/centralMarket', canUploadCentralMarket, banners.importCentralMarketSales)
router.post('/napOrange', canUploadNapOrange, banners.importNapOrangeSales)
router.post('/sobeys', canUploadSobeys, banners.importSobeysSales)
router.post('/loblaws', canUploadLoblaws, banners.importLoblawsSales)
router.post('/parkland', canUploadParkland, banners.importParklandSales)
router.post('/petrocanada', canUploadPetroCanada, banners.importPetroCanadaSales)
router.post('/7eleven', canUpload7Eleven, banners.import7ElevenSales)

export default router

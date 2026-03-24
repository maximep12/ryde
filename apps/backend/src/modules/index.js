import { glob } from 'glob'
import Router from '@koa/router'
import path from 'path'

const mainRouter = new Router()

export default async (app) => {
  const matches = await glob(path.join(__dirname, '*'), { ignore: '**/index.js' })

  matches.forEach((mod) => {
    const routerModule = require(`${mod}/router`)

    if (routerModule.default && typeof routerModule.default.routes === 'function') {
      mainRouter.use(routerModule.default.routes())
    }
  })

  app.use(mainRouter.routes())
  app.use(mainRouter.allowedMethods())
}

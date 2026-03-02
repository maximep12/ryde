import Koa from 'koa'
import devLogger from 'koa-logger'
// import jsonLogger from 'koa-json-logger-next'
import cors from '@koa/cors'
import bodyParser from 'koa-bodyparser'
import passport from 'koa-passport'
import config from 'config'
import modules from 'modules'
import compress from 'koa-compress'
import zlib from 'zlib'
import 'config/passport'

const app = new Koa()

app.on('error', (err, ctx) => {
  console.log(err)
})

const startServer = async () => {
  app.use(devLogger())
  app.use(async (ctx, next) => {
    try {
      await next()
    } catch (err) {
      ctx.status = err.status || 500
      ctx.body = {
        message: (err.nativeError || err).message.split(' - ').pop(),
        details: err.details || err.detail || null,
      }
      ctx.app.emit('error', err, ctx)
    }
  })

  if (process.env.NODE_ENV === 'development') {
    console.log('NODE_ENV is development')
    app.use(cors())
  }

  app.use(
    bodyParser({
      enableTypes: ['json', 'form', 'text'],
    }),
  )
  app.use(
    compress({
      filter(contentType) {
        return /json/i.test(contentType)
      },
      br: {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 1,
        },
      },
    }),
  )

  app.use(passport.initialize())

  await modules(app)

  app.listen(config.port, () => {
    console.log(`Magic happens on ${config.port}`)
  })
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

export default app

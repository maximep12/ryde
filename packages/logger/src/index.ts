import { pino } from 'pino'

export const createBaseLogger = () => {
  if (process.env.LOGGER_ENV === 'production') {
    return pino({
      transport: {
        target: 'pino/file',
      },
    })
  } else {
    return pino({
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
    })
  }
}

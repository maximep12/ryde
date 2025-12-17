import { createBaseLogger } from '@repo/logger'

const logger = createBaseLogger().child({ module: 'stinky-data' })

export const logStinkyData = (data: unknown) => {
  logger.warn(data)
}

type HttpResponseLog = {
  status: number
  method: string
  url: string
  routePath: string
  path: string
  duration: bigint
  requestBody: unknown
  error?: unknown
}

export const formatHttpResponseLog = (log: HttpResponseLog) => {
  return log
}

export const LOG_TYPES = {
  RESPONSE: 'response',
  REQUEST: 'request',
  ERROR: 'error',
} as const

type LogType = (typeof LOG_TYPES)[keyof typeof LOG_TYPES]

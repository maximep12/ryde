import axios from 'axios'
import { env } from './utils/env'

export const UPLOAD_SUCCESS_STATES = {
  COMPLETED: 'completed',
  FILE_ERROR: 'file error',
  FAILURE: 'failure',
} as const

type UploadSuccessState = (typeof UPLOAD_SUCCESS_STATES)[keyof typeof UPLOAD_SUCCESS_STATES]

const SLACK_MESSAGES = {
  success: 'File upload success',
  error: (error: string) => `${error}`,
}

function getSlackIcon({ successState }: { successState: UploadSuccessState }): string {
  switch (successState) {
    case UPLOAD_SUCCESS_STATES.COMPLETED:
      return ':white_check_mark:'
    case UPLOAD_SUCCESS_STATES.FILE_ERROR:
      return ':warning:'
    case UPLOAD_SUCCESS_STATES.FAILURE:
      return ':x:'
    default:
      return 'interroband'
  }
}

function getCurrentEnvironment(): string {
  const environmentMap: Record<string, string> = {
    development: 'DEV',
    qa: 'QA',
    production: 'PROD',
  }
  return environmentMap[env.NODE_ENV] || 'PROD'
}

export async function sendSlackNotification({
  success = false,
  context,
  error,
  channel = '#ryde-logs',
  sentByAdmin = false,
}: {
  success?: boolean
  context: string
  error?: { code?: number; message: string }
  channel?: string
  sentByAdmin?: boolean
}): Promise<void> {
  if (!context) throw new Error('Provide Slack context')
  if (!success && !error) throw new Error('Provide either a success or the error')

  let uploadState: UploadSuccessState
  if (success) {
    uploadState = UPLOAD_SUCCESS_STATES.COMPLETED
  } else {
    if (error?.code === 406) uploadState = UPLOAD_SUCCESS_STATES.FILE_ERROR
    else uploadState = UPLOAD_SUCCESS_STATES.FAILURE
  }

  const icon = getSlackIcon({ successState: uploadState })
  const message = success ? SLACK_MESSAGES.success : SLACK_MESSAGES.error(error?.message ?? 'Unknown error')
  const environment = getCurrentEnvironment()

  const text = `${icon}[${environment}][${context.concat(sentByAdmin ? '-ADMIN' : '')}]: ${message}`

  if (env.NODE_ENV === 'development') return

  try {
    await axios.post(
      'https://slack.com/api/chat.postMessage',
      { channel, text },
      { headers: { authorization: `Bearer ${env.SLACK_TOKEN}` } },
    )
  } catch (e) {
    console.error(JSON.stringify(e))
    throw e
  }
}

export const SLACK_CONTEXT = {
  sellin: 'SELL-IN',
  customers: 'CUSTOMERS',
  confirmed: 'CONFIRMED',
  amazon: 'AMAZON',
  amazonBundles: 'AMAZON BUNDLES',
  rabba: 'RABBA',
  rabbaWorker: 'RABBA WORKER',
  circleK: 'CIRCLE K',
  amazonForecast: 'AMAZON FORECAST',
  centralMarket: 'CENTRAL MARKET',
  loblaws: 'Loblaws',
  parkland: 'PARKLAND',
  petroCanada: 'PETRO CANADA',
  customerProductStatus: 'CUSTOMER PRODUCTS STATUS',
  sevenEleven: '7 ELEVEN',
  customersTargets: 'CUSTOMERS TARGETS',
  sevenElevenConfirmed: '7 ELEVEN CONFIRMED',
  napOrange: 'NAP ORANGE',
  sobeys: 'SOBEYS',
} as const

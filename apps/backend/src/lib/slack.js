import axios from 'axios'
import config from 'config'

const slackToken = config.tokens.slack

function getCurrentEnvironment() {
  const environmentMap = {
    development: 'DEV',
    qa: 'QA',
    production: 'PROD',
  }

  const nodeEnv = process.env.NODE_ENV

  return environmentMap[nodeEnv] || 'PROD'
}

export async function sendSlackNotification({
  success = false,
  context,
  error,
  channel = '#ryde-logs',
  sentByAdmin = false,
}) {
  if (!context) throw new Error('Provide Slack context')
  if (!success && !error) throw new Error('Provide either a success or the error')

  const url = 'https://slack.com/api/chat.postMessage'

  let uploadState
  if (success) uploadState = UPLOAD_SUCCESS_STATES.COMPLETED
  else {
    if (error.code === 406) uploadState = UPLOAD_SUCCESS_STATES.FILE_ERROR
    else uploadState = UPLOAD_SUCCESS_STATES.FAILURE
  }

  const icon = getSlackIcon({ successState: uploadState })
  const message = success ? SLACK_MESSAGES.success : SLACK_MESSAGES.error(error.message)
  const environment = getCurrentEnvironment()

  const text = `${icon}[${environment}][${context.concat(sentByAdmin ? '-ADMIN' : '')}]: ${message}`

  if (process.env.NODE_ENV === 'development') return

  try {
    await axios.post(
      url,
      {
        channel,
        text,
      },
      { headers: { authorization: `Bearer ${slackToken}` } },
    )
  } catch (e) {
    console.log(JSON.stringify(e))
    throw e
  }
}

export const UPLOAD_SUCCESS_STATES = {
  COMPLETED: 'completed',
  FILE_ERROR: 'file error',
  FAILURE: 'failure',
}

const SLACK_MESSAGES = {
  success: 'File upload success',
  error: (error) => `${error}`,
}

function getSlackIcon({ successState }) {
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
}

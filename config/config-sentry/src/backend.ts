import * as Sentry from '@sentry/node'

const SentryConfig = (
  dataSourceName: string,
  environment: string = 'development',
  release: string,
  options: Sentry.NodeOptions,
) => ({
  dsn: dataSourceName,
  environment,
  release,

  // Send structured logs to Sentry
  enableLogs: true,

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,

  tracesSampleRate: 0.25,
  autoSessionTracking: true,

  integrations: options.integrations,
})

export const initSentry = (
  dataSourceName: string | undefined,
  environment: string,
  release: string,
  options: Sentry.NodeOptions = {
    integrations: [],
  },
) => {
  if (!dataSourceName) return
  Sentry.init(SentryConfig(dataSourceName, environment, release, options))
}

export default Sentry

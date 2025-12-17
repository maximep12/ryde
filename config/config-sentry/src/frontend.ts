import * as Sentry from '@sentry/react'

const SentryConfig = (dataSourceName: string, environment: string = 'development') => ({
  dsn: dataSourceName,
  environment,

  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  integrations: [
    // If you're using react router, use the integration for your react router version instead.
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/guides/react/configuration/integrations/react-router/
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // NOTE: This will disable built-in masking.
      // Only use this if your site has no sensitive data, or if you've already set up other options for masking or blocking relevant data, such as 'ignore', 'block', 'mask' and 'maskFn'.
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.feedbackIntegration({
      autoInject: false,
      isNameRequired: true,
      isEmailRequired: true,
    }),
    Sentry.consoleLoggingIntegration({ levels: ['error', 'warn'] }),
    Sentry.captureConsoleIntegration({ levels: ['error'] }),
  ],

  // Enable logs to be sent to Sentry,
  enableLogs: true,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 0.25,

  tracePropagationTargets: [
    'localhost', // For local development
    'https://fuze-dev-api.v7apps.com',
    'https://fuze-qa-api.v7apps.com',
    'https://fuze-preprod-api.v7apps.com',
    'https://fuze-app.ca',
  ],

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  // Learn more at
  // https://docs.sentry.io/platforms/javascript/session-replay/configuration/#general-integration-configuration
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 0.25,
})

export const initSentry = (dataSourceName: string | undefined, environment: string) => {
  if (!dataSourceName) return
  Sentry.init(SentryConfig(dataSourceName, environment))
}

// Export Sentry instance to be used throughout the app (e.g. Sentry.captureMessage)
export { Sentry }

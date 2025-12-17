import { ENV, Environment } from '@repo/constants'
import { FEATURE_FLAGS_ENV } from '@repo/feature-flags'

type Config = {
  env: Environment
  backendURL: string
  logoutUrl: string
  logoutRedirectQuery: string
  guideBasePath: string
  featureFlags: (typeof FEATURE_FLAGS_ENV)[Environment]
}

const base = {
  logoutRedirectQuery: 'post_logout_redirect_uri',
  guideBasePath: '/guide/',
}

const local: Config = {
  ...base,
  env: ENV.LOCAL,
  backendURL: 'http://localhost:5000',
  logoutUrl: 'http://localhost:5000/auth/logout',
  featureFlags: FEATURE_FLAGS_ENV.LOCAL,
}

const dev: Config = {
  ...base,
  env: ENV.DEV,
  backendURL: 'https://api-dev.example.com',
  logoutUrl: 'https://api-dev.example.com/auth/logout',
  featureFlags: FEATURE_FLAGS_ENV.DEV,
}

const prod: Config = {
  ...base,
  env: ENV.PROD,
  backendURL: 'https://api.example.com',
  logoutUrl: 'https://api.example.com/auth/logout',
  featureFlags: FEATURE_FLAGS_ENV.PROD,
}

const configs: Record<Environment, Config> = {
  [ENV.LOCAL]: local,
  [ENV.DEV]: dev,
  [ENV.PROD]: prod,
}

function getEnvConfig(): Config {
  const env = import.meta.env.VITE_FRONTEND_ENV as Environment | undefined
  if (env && env in configs) {
    return configs[env]
  }
  return local
}

const config = getEnvConfig()
export default config

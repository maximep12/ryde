import { Environment } from '@repo/constants'
import { FeatureFlags } from './features'

const LOCAL: FeatureFlags = {
  'placeholder-feature': true,
  'infinite-user-sessions': false,
}

const DEV: FeatureFlags = {
  'placeholder-feature': true,
  'infinite-user-sessions': false,
}

const PROD: FeatureFlags = {
  'placeholder-feature': false,
  'infinite-user-sessions': false,
}

export const FEATURE_FLAGS_ENV: Record<Environment, FeatureFlags> = {
  LOCAL,
  DEV,
  PROD,
}

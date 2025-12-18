import { Environment } from '@repo/constants'
import { FeatureFlags } from './features'

const LOCAL: FeatureFlags = {
  'placeholder-feature': true,
  'infinite-user-sessions': true,
}

const DEV: FeatureFlags = {
  'placeholder-feature': true,
  'infinite-user-sessions': true,
}

const PROD: FeatureFlags = {
  'placeholder-feature': false,
  'infinite-user-sessions': true,
}

export const FEATURE_FLAGS_ENV: Record<Environment, FeatureFlags> = {
  LOCAL,
  DEV,
  PROD,
}

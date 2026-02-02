import { Environment } from '@repo/constants'
import { FeatureFlags } from './features'

const LOCAL: FeatureFlags = {
  'infinite-user-sessions': false,
  'upload-files': false,
}

const DEV: FeatureFlags = {
  'infinite-user-sessions': false,
  'upload-files': false,
}

const PROD: FeatureFlags = {
  'infinite-user-sessions': false,
  'upload-files': false,
}

export const FEATURE_FLAGS_ENV: Record<Environment, FeatureFlags> = {
  LOCAL,
  DEV,
  PROD,
}

import { FeatureFlags } from './features'

const LOCAL: FeatureFlags = {
  'placeholder-feature': true,
}

const DEV: FeatureFlags = {
  'placeholder-feature': true,
}

const PROD: FeatureFlags = {
  'placeholder-feature': false,
}

export const FEATURE_FLAGS_ENV = {
  LOCAL,
  DEV,
  PROD,
}

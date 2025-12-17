export const FEATURES_FLAGS = ['placeholder-feature'] as const

export type FeatureFlag = (typeof FEATURES_FLAGS)[number]
export type FeatureFlags = Record<FeatureFlag, boolean>

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = FEATURES_FLAGS.reduce((acc, flag) => {
  acc[flag] = false
  return acc
}, {} as FeatureFlags)

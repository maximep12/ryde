export const FEATURES_FLAGS = ['infinite-user-sessions', 'upload-files'] as const

export type FeatureFlag = (typeof FEATURES_FLAGS)[number]
export type FeatureFlags = Record<FeatureFlag, boolean>

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = FEATURES_FLAGS.reduce((acc, flag) => {
  acc[flag] = false
  return acc
}, {} as FeatureFlags)

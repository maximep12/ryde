export const ENVIRONMENTS = ['LOCAL', 'DEV', 'PROD'] as const

export type Environment = (typeof ENVIRONMENTS)[number]

export const ENV = {
  LOCAL: 'LOCAL',
  DEV: 'DEV',
  PROD: 'PROD',
} as const satisfies Record<string, Environment>

export const PAGE_SIZE = 15
export const AUTHORIZATION_HEADER_PREFIX = 'SessionToken '

export const YES_NO_FLAG = {
  YES: 'Y',
  NO: 'N',
} as const

export type YesNoFlag = (typeof YES_NO_FLAG)[keyof typeof YES_NO_FLAG]

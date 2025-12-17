import { YES_NO_FLAG, type YesNoFlag } from '@repo/constants'

const boolMap: Record<string, boolean> = { TRUE: true, FALSE: false }

export const toBoolean = (str: string) => boolMap[str.toUpperCase()]

// Convert Y/N database flags to boolean
export const yesNoToBoolean = (flag: string | null | undefined): boolean => flag === YES_NO_FLAG.YES

// Convert boolean to Y/N database flag
export const booleanToYesNo = (value: boolean | null | undefined): YesNoFlag =>
  value ? YES_NO_FLAG.YES : YES_NO_FLAG.NO

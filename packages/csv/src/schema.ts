import { YES_NO_FLAG } from '@repo/constants'
import { z } from 'zod'

// CSV boolean schema accepting Y/N in both uppercase and lowercase
export const csvBooleanSchema = z.enum([
  YES_NO_FLAG.YES,
  YES_NO_FLAG.NO,
  YES_NO_FLAG.YES.toLowerCase(),
  YES_NO_FLAG.NO.toLowerCase(),
])
export type CsvBoolean = z.infer<typeof csvBooleanSchema>

export const csvNumberOrStringSchema = z.union([z.number(), z.string()])
export type CsvNumberOrString = z.infer<typeof csvNumberOrStringSchema>

import { z } from 'zod'

export const booleanString = z
  .string()
  .refine((val) => val === 'true' || val === 'false', {
    message: 'Invalid boolean string',
  })
  .transform((val) => val === 'true')

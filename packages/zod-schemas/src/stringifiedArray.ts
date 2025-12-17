import { z } from 'zod'

export const stringifiedArray = z.coerce.string().transform((str): string[] => {
  try {
    const parsed = JSON.parse(str)

    if (!Array.isArray(parsed)) {
      throw new Error('Expected an array')
    }

    return parsed
  } catch (error) {
    throw new Error('Invalid array format')
  }
})

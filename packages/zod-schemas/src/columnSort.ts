import { z } from 'zod'

export const columnSort = z.object({
  desc: z.boolean(),
  id: z.string(),
})

export const stringifiedColumnSort = z.coerce.string().transform((str) => {
  try {
    const parsed = JSON.parse(str)

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed) ||
      typeof parsed.id !== 'string' ||
      typeof parsed.desc !== 'boolean'
    ) {
      throw new Error('Invalid ColumnSort format')
    }

    return parsed as { id: string; desc: boolean }
  } catch (error) {
    throw new Error('Invalid ColumnSort format')
  }
})

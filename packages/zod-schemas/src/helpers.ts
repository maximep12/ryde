import { z } from 'zod'

export const getSchemaKeys = <T extends z.ZodRawShape>(schema: z.ZodObject<T>): Array<keyof T> => {
  return Object.keys(schema.shape) as Array<keyof T>
}

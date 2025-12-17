import { z } from 'zod'

export const CLIENT_ENV = z
  .object({
    VITE_API_URL: z.string().default('http://localhost:5000'),
  })
  .parse(import.meta.env)

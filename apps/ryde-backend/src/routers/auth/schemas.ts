import { z } from 'zod'

export const requestAccessSchema = z.object({
  email: z.string().email(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const tokenSchema = z.object({
  data: z.object({
    token: z.string(),
  }),
})

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
})

export const setPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  token: z.string(),
})

export const joinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

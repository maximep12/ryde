'use no memo'

import config from '@/config'
import { setRydeToken } from '@/stores/ryde-session'
import { getApi, updateApiClient } from '@/stores/api'
import { setSessionToken } from '@/stores/session'
import { Button, Input, Label } from '@repo/ui/components'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const resetPasswordSearchSchema = z.object({
  token: z.string().catch(''),
})

export const Route = createFileRoute('/reset-password')({
  validateSearch: resetPasswordSearchSchema,
  beforeLoad: ({ search }) => {
    if (!search.token) throw redirect({ to: '/login' })
  },
  component: ResetPasswordPage,
})

type FormValues = {
  email: string
  password: string
  confirmPassword: string
}

function ResetPasswordPage() {
  const { token } = Route.useSearch()

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  const onSubmit = async (data: FormValues) => {
    if (data.password !== data.confirmPassword) {
      setError('confirmPassword', { message: 'Passwords do not match' })
      return
    }

    try {
      const res = await fetch(`${config.rydeBackendURL}/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password, token }),
      })

      if (!res.ok) {
        const body = await res.json()
        setError('root', {
          message: 'message' in body ? String(body.message) : 'Something went wrong',
        })
        return
      }

      const body = await res.json()

      // Authenticate with ryde-backend (same credentials)
      setRydeToken(body.token)

      // Also create a franklin session
      try {
        const api = getApi()
        const franklinRes = await api.auth.callback.$post({
          json: { email: data.email, password: data.password },
        })
        if (franklinRes.ok) {
          const franklinData = await franklinRes.json()
          setSessionToken(franklinData.sessionToken)
          updateApiClient(franklinData.sessionToken)
        }
      } catch {
        // Non-critical
      }

      window.location.href = '/'
    } catch {
      setError('root', { message: 'An error occurred. Please try again.' })
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="text-muted-foreground text-sm">Enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          {errors.root && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {errors.root.message}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
            />
            {errors.password && (
              <p className="text-destructive text-sm">{errors.password.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword', { required: 'Please confirm your password' })}
            />
            {errors.confirmPassword && (
              <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              isSubmitting || !watch('email') || !watch('password') || !watch('confirmPassword')
            }
          >
            {isSubmitting ? 'Saving...' : 'Reset password'}
          </Button>
        </form>
      </div>
    </div>
  )
}

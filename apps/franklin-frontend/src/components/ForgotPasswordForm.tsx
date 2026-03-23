import config from '@/config'
import { Button, Input, Label } from '@repo/ui/components'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')

  const { mutate, isPending, isSuccess, error } = useMutation<void, Error, string>({
    mutationFn: async (email: string) => {
      const res = await fetch(`${config.rydeBackendURL}/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error('An error occurred. Please try again.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutate(email)
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-bold">Check your inbox</h1>
        <p className="text-muted-foreground text-sm">
          If an account exists for <span className="text-foreground font-medium">{email}</span>,
          you'll receive a password reset link shortly.
        </p>
        <button onClick={onBack} className="text-sm underline">
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="text-muted-foreground text-sm">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error.message}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isPending || !email}>
          {isPending ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>

      <div className="text-center">
        <button onClick={onBack} className="text-muted-foreground text-sm underline">
          Back to sign in
        </button>
      </div>
    </div>
  )
}

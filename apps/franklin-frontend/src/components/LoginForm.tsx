import { getApi, updateApiClient } from '@/stores/api'
import { type MetabaseUrls, setMetabaseUrls, setSessionToken } from '@/stores/session'
import { Button, Input, Label } from '@repo/ui/components'
import { cn } from '@repo/ui/lib'
import { useState } from 'react'

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const api = getApi()
      const res = await api.auth.login.$post({ json: { email, password } })

      if (!res.ok) {
        const data = await res.json()
        const message = 'message' in data ? (data.message as string) : null
        if (message === 'invalidCredentials') {
          setError('Invalid email or password. Please try again.')
          return
        }
        setError(message ?? 'Invalid credentials')
        return
      }

      const data = await res.json()
      setSessionToken(data.token)
      updateApiClient(data.token)

      const urls = data.metabaseDashboardUrls as MetabaseUrls | undefined
      if (urls && Object.keys(urls).length > 0) {
        setMetabaseUrls(urls)
      }

      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect') || '/'
      window.location.href = redirect
    } catch (err) {
      console.error('Login failed:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('mb-42 flex flex-col gap-6', className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Enter your credentials to sign in</p>
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

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading || !email || !password}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">{error}</div>
        )}
      </form>
    </div>
  )
}

import { Button, Input, Label } from '@repo/ui/components'
import { cn } from '@repo/ui/lib'
import { useState } from 'react'
import { setAuthSession } from '@/lib/auth'

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Mock login - replace with actual API call
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Mock session - replace with actual auth response
      setAuthSession({
        userId: '1',
        loginToken: 'mock-token',
        loginTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        tenantId: 'default',
        user: {
          id: '1',
          email,
          firstName: 'Demo',
          lastName: 'User',
          isEnabled: true,
          roles: ['user'],
        },
      })

      window.location.href = '/'
    } catch (error) {
      console.error('Login failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
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

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}

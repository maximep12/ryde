import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import config from '@/config'
import { getSessionToken, setSessionToken } from '@/stores/session'
import { getApi, updateApiClient } from '@/stores/api'
import { LoginForm } from '@/components/LoginForm'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    if (getSessionToken()) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(
    config.featureFlags['infinite-user-sessions'],
  )

  useEffect(() => {
    if (!config.featureFlags['infinite-user-sessions']) return

    async function autoLogin() {
      try {
        const api = getApi()
        const res = await api.auth.callback.$post({
          json: { email: 'admin@example.com', password: 'admin123' },
        })

        if (res.ok) {
          const data = await res.json()
          setSessionToken(data.sessionToken)
          updateApiClient(data.sessionToken)

          const params = new URLSearchParams(window.location.search)
          const redirectUrl = params.get('redirect') || '/'
          window.location.href = redirectUrl
        } else {
          setIsAutoLoggingIn(false)
        }
      } catch {
        setIsAutoLoggingIn(false)
      }
    }

    autoLogin()
  }, [])

  if (isAutoLoggingIn) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="text-muted-foreground">Signing in...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <LoginForm />
        <p className="text-muted-foreground bg-muted rounded-md px-4 py-2 text-center text-sm">
          Demo: admin@example.com / admin123
        </p>
      </div>
    </div>
  )
}

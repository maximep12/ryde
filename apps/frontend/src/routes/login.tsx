import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import config from '@/config'
import { getSessionToken, setSessionToken } from '@/stores/session'
import { getApi, updateApiClient } from '@/stores/api'
import { LoginForm } from '@/components/LoginForm'
import catImage from '@/static/images/cat.svg'

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
          json: { email: 'johanne.belanger@intersand.com', password: 'admin123' },
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
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
      <img
        src={catImage}
        alt=""
        className="pointer-events-none fixed right-4 bottom-4 z-10 w-[15vw] opacity-10"
      />
    </div>
  )
}

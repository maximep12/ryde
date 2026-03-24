import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { getSessionToken } from '@/stores/session'
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm'
import { LoginForm } from '@/components/LoginForm'
import { RequestAccessForm } from '@/components/RequestAccessForm'
import { RydeLogo } from '@/components/RydeLogo'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    if (getSessionToken()) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const [view, setView] = useState<'login' | 'request-access' | 'forgot-password'>('login')

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <RydeLogo className="h-10 w-auto" />
        </div>
        {view === 'login' ? (
          <>
            <LoginForm />
            <div className="text-center">
              <button
                onClick={() => setView('forgot-password')}
                className="text-muted-foreground text-sm underline"
              >
                Forgot your password?
              </button>
            </div>
            <div className="text-center">
              <span className="text-muted-foreground text-sm">Don't have an account? </span>
              <button
                onClick={() => setView('request-access')}
                className="text-sm font-medium underline"
              >
                Request access
              </button>
            </div>
          </>
        ) : view === 'request-access' ? (
          <RequestAccessForm onBack={() => setView('login')} />
        ) : (
          <ForgotPasswordForm onBack={() => setView('login')} />
        )}
      </div>
    </div>
  )
}

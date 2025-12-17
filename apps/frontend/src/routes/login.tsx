import { createFileRoute, redirect } from '@tanstack/react-router'
import { isAuthenticated } from '@/lib/auth'
import { LoginForm } from '@/components/LoginForm'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    if (isAuthenticated()) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}

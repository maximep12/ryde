import { Button } from '@repo/ui/components'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/unauthorized')({
  component: UnauthorizedPage,
})

function UnauthorizedPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-6xl font-bold">401</h1>
      <h2 className="text-2xl font-semibold">Unauthorized</h2>
      <p className="text-muted-foreground max-w-md">
        You don't have permission to access this page. Please sign in or contact an administrator.
      </p>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link to="/">Go Home</Link>
        </Button>
        <Button asChild>
          <Link to="/login">Sign In</Link>
        </Button>
      </div>
    </div>
  )
}

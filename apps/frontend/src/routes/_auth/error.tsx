import { Button } from '@repo/ui/components'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/error')({
  component: ErrorPage,
})

function ErrorPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-6xl font-bold">500</h1>
      <h2 className="text-2xl font-semibold">Something Went Wrong</h2>
      <p className="text-muted-foreground max-w-md">
        An unexpected error occurred. Please try again later or contact support if the problem
        persists.
      </p>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link to="/">Go Home</Link>
        </Button>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    </div>
  )
}

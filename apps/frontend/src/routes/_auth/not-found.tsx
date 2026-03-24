import { Button } from '@repo/ui/components'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/not-found')({
  component: NotFoundPage,
})

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="relative select-none">
        <span className="text-muted/30 pointer-events-none text-[160px] leading-none font-black tracking-tighter">
          404
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-background rounded-full p-4 shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
              <path d="M11 8v4" />
              <path d="M11 16h.01" />
            </svg>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          The page you're looking for doesn't exist or you don't have access to it.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Go Home</Link>
      </Button>
    </div>
  )
}

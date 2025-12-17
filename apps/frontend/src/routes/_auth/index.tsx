import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/')({
  component: DashboardPage,
  staticData: {
    title: 'route.dashboard',
    crumb: 'route.dashboard',
  },
})

function DashboardPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome to your dashboard</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Your starter kit is ready</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              This is a minimal frontend template with authentication, routing, and UI components.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Backend API</CardTitle>
            <CardDescription>Hono-powered API</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              The backend runs on port 5000 with full TypeScript support and Drizzle ORM.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>UI Components</CardTitle>
            <CardDescription>shadcn/ui based</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Pre-configured with Tailwind v4 and a collection of accessible components.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

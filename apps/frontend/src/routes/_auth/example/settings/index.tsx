import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/example/settings/')({
  component: SettingsPage,
  staticData: {
    title: 'route.settings',
    crumb: 'route.settings',
  },
})

function SettingsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Settings content coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}

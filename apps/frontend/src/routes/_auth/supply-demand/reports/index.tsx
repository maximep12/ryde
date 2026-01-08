import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/supply-demand/reports/')({
  component: ReportsPage,
  staticData: {
    title: 'route.supplyDemandReports',
    crumb: 'route.supplyDemandReports',
  },
})

function ReportsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">Supply & Demand reports</p>
      </header>
    </div>
  )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components'
import { createFileRoute } from '@tanstack/react-router'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export const Route = createFileRoute('/_auth/')({
  component: DashboardPage,
  staticData: {
    title: 'route.dashboard',
    crumb: 'route.dashboard',
  },
})

const lineChartData = [
  { month: 'Jan', visitors: 1240, pageViews: 3720, conversions: 186 },
  { month: 'Feb', visitors: 1580, pageViews: 4420, conversions: 221 },
  { month: 'Mar', visitors: 2150, pageViews: 5890, conversions: 312 },
  { month: 'Apr', visitors: 1890, pageViews: 5120, conversions: 278 },
  { month: 'May', visitors: 2680, pageViews: 7340, conversions: 402 },
  { month: 'Jun', visitors: 3120, pageViews: 8560, conversions: 468 },
  { month: 'Jul', visitors: 2890, pageViews: 7920, conversions: 433 },
  { month: 'Aug', visitors: 3450, pageViews: 9480, conversions: 517 },
  { month: 'Sep', visitors: 4120, pageViews: 11330, conversions: 618 },
  { month: 'Oct', visitors: 4780, pageViews: 13140, conversions: 717 },
  { month: 'Nov', visitors: 5240, pageViews: 14410, conversions: 786 },
  { month: 'Dec', visitors: 4890, pageViews: 13450, conversions: 733 },
]

const pieChartData = [
  { name: 'Direct', value: 4200 },
  { name: 'Organic Search', value: 3800 },
  { name: 'Referral', value: 2400 },
  { name: 'Social Media', value: 1800 },
  { name: 'Email', value: 1200 },
]

const PIE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

const barChartData = [
  { category: 'Electronics', sales: 4200, returns: 320 },
  { category: 'Clothing', sales: 3800, returns: 280 },
  { category: 'Home & Garden', sales: 2900, returns: 190 },
  { category: 'Sports', sales: 2100, returns: 150 },
  { category: 'Books', sales: 1800, returns: 90 },
  { category: 'Toys', sales: 1500, returns: 120 },
]

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

      <Card>
        <CardHeader>
          <CardTitle>Analytics Overview</CardTitle>
          <CardDescription>Monthly visitors and page views for the current year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: 'currentColor' }} />
                <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="pageViews"
                  name="Page Views"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="visitors"
                  name="Visitors"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  name="Conversions"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
            <CardDescription>Breakdown of visitor acquisition channels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Product sales and returns comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="category" className="text-xs" tick={{ fill: 'currentColor' }} />
                  <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'var(--foreground)' }}
                    cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                  />
                  <Legend />
                  <Bar dataKey="sales" name="Sales" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="returns" name="Returns" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

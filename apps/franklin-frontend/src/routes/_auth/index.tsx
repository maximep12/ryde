import { useMe } from '@/hooks/queries/auth/useMe'
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
  component: WelcomePage,
  staticData: {
    title: 'route.welcome',
    crumb: 'route.welcome',
  },
})

function getGreetingForTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// Production & shipment data (in tons)
const lineChartData = [
  { month: 'Jan', produced: 142, shipped: 138, orders: 89 },
  { month: 'Feb', produced: 156, shipped: 151, orders: 94 },
  { month: 'Mar', produced: 168, shipped: 162, orders: 102 },
  { month: 'Apr', produced: 175, shipped: 170, orders: 108 },
  { month: 'May', produced: 189, shipped: 184, orders: 118 },
  { month: 'Jun', produced: 195, shipped: 191, orders: 124 },
  { month: 'Jul', produced: 188, shipped: 185, orders: 119 },
  { month: 'Aug', produced: 201, shipped: 196, orders: 128 },
  { month: 'Sep', produced: 215, shipped: 208, orders: 136 },
  { month: 'Oct', produced: 228, shipped: 221, orders: 145 },
  { month: 'Nov', produced: 245, shipped: 238, orders: 156 },
  { month: 'Dec', produced: 232, shipped: 225, orders: 148 },
]

// Sales by client type (in $K)
const pieChartData = [
  { name: 'Grocery Stores', value: 425 },
  { name: 'Supermarkets', value: 380 },
  { name: 'Corner Stores', value: 245 },
  { name: 'Convenience Stores', value: 165 },
  { name: 'Pharmacies', value: 85 },
]

const PIE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

// Sales by product line (in units K) and returns
const barChartData = [
  { category: 'Chocolate', sales: 485, returns: 8 },
  { category: 'Gummy', sales: 380, returns: 10 },
  { category: 'Hard Candy', sales: 320, returns: 6 },
  { category: 'Lollipops', sales: 220, returns: 4 },
]

function AnimatedNumber({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span
      className="inline-block"
      style={{
        animation: 'fadeInUp 0.6s ease-out forwards',
        animationDelay: `${delay}s`,
        opacity: 0,
      }}
    >
      <style>
        {`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
      {children}
    </span>
  )
}

function WelcomePage() {
  const { data: user } = useMe()

  const timeGreeting = getGreetingForTimeOfDay()
  const userName = user?.givenName || user?.familyName

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">
          {timeGreeting}
          {userName && (
            <>
              , <span className="text-primary">{userName}</span>
            </>
          )}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of what's happening in your world
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Active Orders</CardTitle>
            <CardDescription>Pending fulfillment</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              <AnimatedNumber delay={0.1}>47</AnimatedNumber>
            </p>
            <p className="text-muted-foreground mt-1 text-sm">12 processing, 35 ready to ship</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Level</CardTitle>
            <CardDescription>Current stock status</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              <AnimatedNumber delay={0.2}>1,245 tons</AnimatedNumber>
            </p>
            <p className="text-muted-foreground mt-1 text-sm">Across all product lines</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
            <CardDescription>December 2024</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              <AnimatedNumber delay={0.3}>$1.32M</AnimatedNumber>
            </p>
            <p className="text-muted-foreground mt-1 text-sm">+8.4% from last month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production & Shipments</CardTitle>
          <CardDescription>
            Monthly production output, shipments, and orders (in tons)
          </CardDescription>
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
                  dataKey="produced"
                  name="Produced (tons)"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="shipped"
                  name="Shipped (tons)"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  name="Orders"
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
            <CardTitle>Sales by Client Type</CardTitle>
            <CardDescription>Revenue distribution across client segments ($K)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%" debounce={0}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="var(--background)"
                    strokeWidth={2}
                    animationBegin={0}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
                    style={{ fontSize: '11px' }}
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
            <CardTitle>Sales by Product Line</CardTitle>
            <CardDescription>Volume sold and returns by candy type (units K)</CardDescription>
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
                  <Bar
                    dataKey="sales"
                    name="Sold (K units)"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="returns"
                    name="Returns (K units)"
                    fill="var(--chart-3)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

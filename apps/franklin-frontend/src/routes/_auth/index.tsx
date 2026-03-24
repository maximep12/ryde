import { useMe } from '@/hooks/queries/auth/useMe'
import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/components'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BarChart3Icon, BoxIcon, FileTextIcon, PackageIcon, TrendingDownIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_auth/')({
  component: WelcomePage,
  staticData: {
    title: 'route.welcome',
    crumb: 'route.welcome',
  },
})

const dashboardCards = [
  {
    titleKey: 'route.commercial',
    descriptionKey: 'welcome.commercialDesc',
    path: '/commercial',
    icon: BarChart3Icon,
  },
  {
    titleKey: 'route.sellout',
    descriptionKey: 'welcome.selloutDesc',
    path: '/sellout',
    icon: TrendingDownIcon,
  },
  {
    titleKey: 'route.inventory',
    descriptionKey: 'welcome.inventoryDesc',
    path: '/inventory',
    icon: BoxIcon,
  },
  {
    titleKey: 'route.reports',
    descriptionKey: 'welcome.reportsDesc',
    path: '/reports',
    icon: FileTextIcon,
  },
  {
    titleKey: 'route.amazon',
    descriptionKey: 'welcome.amazonDesc',
    path: '/amazon',
    icon: PackageIcon,
  },
] as const

function getGreetingForTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function WelcomePage() {
  const { data: me } = useMe()
  const { t } = useTranslation(['routes', 'ui'])
  const userName = me?.user?.fullName

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">
          {getGreetingForTimeOfDay()}
          {userName && (
            <>
              , <span className="text-primary">{userName}</span>
            </>
          )}
        </h1>
        <p className="text-muted-foreground mt-1">Select a dashboard to get started</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dashboardCards.map((card) => (
          <Link key={card.path} to={card.path} className="group">
            <Card className="group-hover:border-primary/50 h-full transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary rounded-lg p-2">
                    <card.icon className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t(`routes:${card.titleKey}`)}</CardTitle>
                    <CardDescription>{t(`ui:${card.descriptionKey}`)}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

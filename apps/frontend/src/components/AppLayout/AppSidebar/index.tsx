import useLogout from '@/hooks/queries/auth/useLogout'
import { useClient } from '@/hooks/queries/clients/useClient'
import { useOrder } from '@/hooks/queries/orders/useOrder'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@repo/ui/components'
import { Link, useLocation } from '@tanstack/react-router'
import { LogOutIcon } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  clientsNavigation,
  examplesNavigation,
  ExternalLinkItem,
  externalNavigation,
  navigation,
  NavigationItem,
  ordersNavigation,
  supplyDemandNavigation,
  uiUxNavigation,
} from './navigation'

function IntersandLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="82 0 57 57"
      className={className}
      fill="currentColor"
    >
      <path d="M122.346 22.4028C123.674 20.3705 124.92 16.9171 124.954 13.498C125.05 6.04181 120.463 0 113.404 0C106.346 0 101.231 6.04181 101.135 13.5048C101.087 16.6356 101.56 19.1622 102.772 21.8054C91.5846 25.1696 84.2863 34.6168 82.8622 45.6706C82.8691 45.65 82.8759 45.65 82.8759 45.65C82.7527 46.6043 82.7184 47.1948 82.7184 47.1948C82.3967 50.1608 84.6217 52.8041 87.689 53.1267C90.7562 53.4288 93.1456 51.5476 93.8302 48.3139C94.5286 45.1007 96.9043 40.5694 101.32 39.1413C101.628 37.6789 101.615 33.4359 102.019 28.5682C104.607 28.5682 107.147 31.7401 107.147 31.7401C108.954 30.2983 111.152 29.4264 113.507 29.4264C115.862 29.4264 118.436 30.2983 120.394 31.7401C120.394 31.7401 121.791 28.5682 125.598 28.5682C126.679 38.8873 126.543 45.6637 116.198 45.6637H111.734C108.708 45.6637 106.695 48.1217 107.236 51.1494C107.783 54.1909 110.679 56.6557 113.705 56.6557H122.551C122.921 56.6557 123.338 56.6214 123.77 56.539C134.094 55.6396 138.654 48.9661 138.051 41.9425C137.415 34.4383 132.561 26.1789 122.332 22.4028" />
    </svg>
  )
}

function NavSection({
  items,
  label,
  isActiveCheck,
  getSuffix,
}: {
  items: NavigationItem[]
  label: string
  isActiveCheck: (path: string) => boolean
  getSuffix?: (path: string) => React.ReactNode
}) {
  const { t } = useTranslation(['ui', 'routes'])
  const visibleItems = items.filter((item) => !item.shouldHide)

  if (visibleItems.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {visibleItems.map((item) => {
          const suffix = getSuffix?.(item.path)
          return (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton asChild isActive={isActiveCheck(item.path)}>
                <Link to={item.path}>
                  <item.icon className="size-4" />
                  <span className="flex-1">{t(`routes:${item.title}`)}</span>
                  {suffix && (
                    <span className="text-muted-foreground ml-auto font-mono text-xs">
                      {suffix}
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function ClientsNavSection({ label }: { label: string }) {
  const { t } = useTranslation(['ui', 'routes'])
  const location = useLocation()

  // Extract client ID from URL if on a client detail page
  const clientIdMatch = location.pathname.match(/^\/clients\/(\d+)/)
  const clientId = clientIdMatch ? Number(clientIdMatch[1]) : 0

  // Fetch client data to get the client code (will use cache if already fetched)
  const { data: client } = useClient(clientId)

  const visibleItems = clientsNavigation.filter((item) => !item.shouldHide)

  if (visibleItems.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {visibleItems.map((item) => {
          const isActive =
            item.path === '/clients'
              ? location.pathname === '/clients' || /^\/clients\/\d+/.test(location.pathname)
              : location.pathname === item.path

          const suffix = item.path === '/clients' && client?.clientCode ? client.clientCode : null

          return (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton asChild isActive={isActive}>
                <Link to={item.path}>
                  <item.icon className="size-4" />
                  <span className="flex-1">{t(`routes:${item.title}`)}</span>
                  {suffix && (
                    <span className="text-muted-foreground ml-auto font-mono text-xs">
                      {suffix}
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function OrdersNavSection({ label }: { label: string }) {
  const { t } = useTranslation(['ui', 'routes'])
  const location = useLocation()

  // Extract order ID from URL if on an order detail page
  const orderIdMatch = location.pathname.match(/^\/orders\/(\d+)/)
  const orderId = orderIdMatch ? Number(orderIdMatch[1]) : 0

  // Fetch order data to get the order number (will use cache if already fetched)
  const { data: order } = useOrder(orderId)

  const visibleItems = ordersNavigation.filter((item) => !item.shouldHide)

  if (visibleItems.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {visibleItems.map((item) => {
          const isActive =
            item.path === '/orders'
              ? location.pathname === '/orders' || /^\/orders\/\d+/.test(location.pathname)
              : location.pathname === item.path

          const suffix = item.path === '/orders' && order?.orderNumber ? order.orderNumber : null

          return (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton asChild isActive={isActive}>
                <Link to={item.path}>
                  <item.icon className="size-4" />
                  <span className="flex-1">{t(`routes:${item.title}`)}</span>
                  {suffix && (
                    <span className="text-muted-foreground ml-auto font-mono text-xs">
                      {suffix}
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function ExternalNavSection({ items, label }: { items: ExternalLinkItem[]; label: string }) {
  const { t } = useTranslation('ui')

  if (items.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton asChild>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <item.icon className="size-4" />
                <span>{t(item.title)}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const { logout } = useLogout()
  const { t } = useTranslation(['ui', 'routes'])

  return (
    <Sidebar variant="inset" className="border-r" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          <IntersandLogo className="text-primary size-7" />
          <span className="text-lg font-bold tracking-tight">Intersand</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavSection
          items={navigation}
          label={t('sidebar.navigation')}
          isActiveCheck={(path) => location.pathname === path}
        />
        <OrdersNavSection label={t('sidebar.orders')} />
        <ClientsNavSection label={t('sidebar.clients')} />
        <NavSection
          items={supplyDemandNavigation}
          label={t('sidebar.supplyDemand')}
          isActiveCheck={(path) => location.pathname.startsWith(path)}
        />
        <NavSection
          items={examplesNavigation}
          label={t('sidebar.examples')}
          isActiveCheck={(path) => location.pathname.startsWith(path)}
        />
        <NavSection
          items={uiUxNavigation}
          label={t('sidebar.uiUx')}
          isActiveCheck={(path) => location.pathname === path}
        />
        <ExternalNavSection items={externalNavigation} label={t('sidebar.external')} />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout}>
              <LogOutIcon className="size-4" />
              <span>{t('auth.logOut')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

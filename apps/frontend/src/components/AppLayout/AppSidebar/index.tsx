import { useCurrentItem } from '@/contexts/CurrentItemContext'
import useLogout from '@/hooks/queries/auth/useLogout'
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
import { LogOutIcon, BoxIcon } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  adminNavigation,
  exampleNavigation,
  navigation,
  NavigationItem,
} from './navigation'

function NavSection({
  items,
  label,
  pathname,
  getChildLabel,
}: {
  items: NavigationItem[]
  label: string
  pathname: string
  getChildLabel?: (path: string, childSegment: string) => string | null
}) {
  const { t } = useTranslation(['ui', 'routes'])
  const visibleItems = items.filter((item) => !item.shouldHide)
  const allPaths = items.map((item) => item.path)

  if (visibleItems.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {visibleItems.map((item) => {
          // Check if exactly on this path
          const isExactMatch = pathname === item.path

          // Check if on a child route (for items with matchChildRoutes)
          // Must start with the path, not be an exact match of another nav item, and not be the exact path
          const isChildRoute =
            item.matchChildRoutes &&
            pathname.startsWith(item.path + '/') &&
            !allPaths.includes(pathname as typeof item.path)

          const isActive = isExactMatch || isChildRoute

          // Extract the child segment (e.g., "35" from "/example/clients/35")
          let childLabel: string | null = null
          if (isChildRoute) {
            const remainder = pathname.slice(item.path.length + 1) // +1 for the "/"
            const firstSegment = remainder.split('/')[0]
            if (firstSegment) {
              // Use custom label lookup if provided, otherwise use the segment as-is
              childLabel = getChildLabel?.(item.path, firstSegment) ?? firstSegment
            }
          }

          return (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton asChild isActive={isActive}>
                <Link to={item.path}>
                  <item.icon className="size-4" />
                  <span className="flex-1">{t(`routes:${item.title}`)}</span>
                  {childLabel && (
                    <span className="text-muted-foreground max-w-[80px] truncate font-mono text-xs">
                      {childLabel}
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const { logout } = useLogout()
  const { t } = useTranslation(['ui', 'routes'])
  const { getLabel } = useCurrentItem()

  // Lookup function to get friendly labels for child routes
  const getChildLabel = React.useCallback(
    (path: string, childSegment: string): string | null => {
      // Check if a page has registered a label for this path
      const registeredLabel = getLabel(path)
      if (registeredLabel) {
        return registeredLabel
      }
      // Fall back to the URL segment
      return childSegment
    },
    [getLabel],
  )

  return (
    <Sidebar variant="inset" className="border-r" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          <BoxIcon className="text-primary size-7" />
          <span className="text-lg font-bold tracking-tight">Franklin</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavSection
          items={navigation}
          label={t('sidebar.navigation')}
          pathname={location.pathname}
        />
        <NavSection
          items={adminNavigation}
          label={t('sidebar.admin')}
          pathname={location.pathname}
        />
        <NavSection
          items={exampleNavigation}
          label={t('sidebar.examples')}
          pathname={location.pathname}
          getChildLabel={getChildLabel}
        />
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

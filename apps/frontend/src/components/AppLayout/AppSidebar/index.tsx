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
import { LogOutIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { examplesNavigation, navigation, NavigationItem, uiUxNavigation } from './navigation'

function NavSection({
  items,
  label,
  isActiveCheck,
}: {
  items: NavigationItem[]
  label: string
  isActiveCheck: (path: string) => boolean
}) {
  const { t } = useTranslation(['ui', 'routes'])
  const visibleItems = items.filter((item) => !item.shouldHide)

  if (visibleItems.length === 0) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {visibleItems.map((item) => (
          <SidebarMenuItem key={item.path}>
            <SidebarMenuButton asChild isActive={isActiveCheck(item.path)}>
              <Link to={item.path}>
                <item.icon className="size-4" />
                <span>{t(`routes:${item.title}`)}</span>
              </Link>
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
        <div className="flex items-center px-2">
          <span className="text-lg font-bold tracking-tight">Franklin Project</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavSection
          items={navigation}
          label={t('sidebar.navigation')}
          isActiveCheck={(path) => location.pathname === path}
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

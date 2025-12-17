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
import { BookOpenIcon, HomeIcon, LogOutIcon, SettingsIcon } from 'lucide-react'
import { logout } from '@/lib/auth'

const navigation = [
  { title: 'Dashboard', url: '/', icon: HomeIcon },
  { title: 'Books', url: '/books', icon: BookOpenIcon },
  { title: 'Settings', url: '/settings', icon: SettingsIcon },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <div className="flex h-12 items-center px-4 font-semibold">Starter App</div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {navigation.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                  <Link to={item.url}>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOutIcon className="size-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

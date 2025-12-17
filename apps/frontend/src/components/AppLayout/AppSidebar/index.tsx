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
import { navigation } from './navigation'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const { logout } = useLogout()

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <div className="flex h-12 items-center px-4 font-semibold">Franklin - V7 Starter App</div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {navigation.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild isActive={location.pathname === item.path}>
                  <Link to={item.path}>
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
            <SidebarMenuButton onClick={logout}>
              <LogOutIcon className="size-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

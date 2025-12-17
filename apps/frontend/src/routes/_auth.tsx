import { SidebarInset, SidebarProvider, SidebarTrigger } from '@repo/ui/components'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { isAuthenticated } from '@/lib/auth'
import { AppSidebar } from '@/components/AppSidebar'

export const Route = createFileRoute('/_auth')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

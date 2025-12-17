import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRoute, Outlet, redirect } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { isAuthenticated } from '../lib/auth'

const queryClient = new QueryClient()

const devToolsEnabled = import.meta.env.DEV

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (location.pathname === '/' && location.search === '' && location.hash === '') {
      const authenticated = isAuthenticated()
      if (!authenticated) {
        throw redirect({
          to: '/login',
        })
      }
    }
  },
  component: () => (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      {devToolsEnabled && (
        <>
          <TanStackRouterDevtools />
          <ReactQueryDevtools />
        </>
      )}
    </QueryClientProvider>
  ),
})

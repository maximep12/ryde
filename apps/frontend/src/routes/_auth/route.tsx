import { AppHeader } from '@/components/AppLayout/AppHeader'
import { AppSidebar } from '@/components/AppLayout/AppSidebar'
import { ThemeProvider } from '@/components/ThemeProvider'
import { useMe } from '@/hooks/queries/auth/useMe'
import { handleInvalidSession, verifySession } from '@/hooks/queries/auth/useVerifySession'
import { getSessionToken } from '@/stores/session'
import { MILLIS } from '@repo/constants'
import { SidebarProvider } from '@repo/ui/components'
import {
  CatchBoundary,
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

export const Route = createFileRoute('/_auth')({
  component: AuthLayoutComponent,
  pendingComponent: () => <div>Loading...</div>,
  beforeLoad: async ({ context, location }) => {
    const redirectToLogin = () => {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }

    const sessionToken = getSessionToken()
    if (!sessionToken) return redirectToLogin()

    const { queryClient } = context

    try {
      const isVerified = await queryClient.fetchQuery({
        queryKey: ['verifiedSession'],
        queryFn: async () => await verifySession(),
        staleTime: MILLIS.SECOND * 10,
        retry: false,
      })

      if (!isVerified) {
        handleInvalidSession()
        return
      }
    } catch (error) {
      console.error(error)
      handleInvalidSession()
      return
    }
  },
})

function ErrorComponent(props: { error: Error }) {
  const navigate = useNavigate()
  console.error(props.error)

  if ('status' in props.error && props.error.status === 401) {
    navigate({
      to: '/not-found',
      search: { redirect: location.href },
    })
  } else if ('status' in props.error && props.error.status === 403) {
    navigate({
      to: '/unauthorized',
      search: { redirect: location.href },
    })
  } else {
    const message = props.error?.message ? props.error.message : ''
    navigate({
      to: '/error',
      search: { redirect: location.href, message },
    })
  }

  return <Outlet />
}

function AuthLayoutComponent() {
  const { data: me, error } = useMe()

  const viewportRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    viewportRef.current?.scrollTo(0, 0)
  }, [pathname])

  if (!me) return null
  if (error) return <div>Error</div>

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="text-foreground text-sm subpixel-antialiased">
        <SidebarProvider className="fixed top-0 left-0 w-screen">
          <AppSidebar />

          <div className="flex max-h-svh w-full flex-col">
            <AppHeader />

            <div
              className="bg-background-level-2 h-full w-full flex-1 overflow-y-auto"
              ref={viewportRef}
            >
              <div className="mx-auto w-full max-w-5xl px-6 py-6">
                <CatchBoundary getResetKey={() => 'reset'} errorComponent={ErrorComponent}>
                  <Outlet />
                </CatchBoundary>
              </div>
            </div>
          </div>
        </SidebarProvider>
      </div>
    </ThemeProvider>
  )
}

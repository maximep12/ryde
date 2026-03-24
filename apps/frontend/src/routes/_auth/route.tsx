import { AppHeader } from '@/components/AppLayout/AppHeader'
import { AppSidebar } from '@/components/AppLayout/AppSidebar'
import { ThemeProvider } from '@/components/ThemeProvider'
import { useMe } from '@/hooks/queries/auth/useMe'
import { useMetabaseUrls } from '@/hooks/queries/auth/useMetabaseUrls'
import { useSessionRevalidateOnFocus } from '@/hooks/queries/auth/useSessionRevalidateOnFocus'
import {
  handleInvalidSession,
  useVerifySession,
  verifySession,
} from '@/hooks/queries/auth/useVerifySession'
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
import { Toaster } from 'sonner'

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
  useVerifySession()
  useSessionRevalidateOnFocus()
  useMetabaseUrls()

  const { data: me, error } = useMe()

  const viewportRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  const fullWidthRoutes = ['/commercial', '/sellout', '/inventory', '/reports', '/amazon']
  const isFullWidth = fullWidthRoutes.includes(pathname)

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
              className="bg-background-level-2 relative h-full w-full flex-1 overflow-y-scroll"
              ref={viewportRef}
            >
              <div className={isFullWidth ? 'h-full w-full' : 'mx-auto w-full max-w-6xl px-6 py-6'}>
                <CatchBoundary getResetKey={() => 'reset'} errorComponent={ErrorComponent}>
                  <Outlet />
                </CatchBoundary>
              </div>
            </div>
          </div>
        </SidebarProvider>
        <Toaster position="top-right" richColors offset="64px" style={{ right: 32 }} />
      </div>
    </ThemeProvider>
  )
}

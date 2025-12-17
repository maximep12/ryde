import '@fontsource-variable/inter'
import { appErrorCodes } from '@repo/constants'
import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { routeTree } from './routeTree.gen'
import './styles/globals.css'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if ('status' in error && typeof error.status === 'number') {
          return appErrorCodes.has(error.status) ? false : failureCount < 3
        }
        return failureCount < 3
      },
    },
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: {
    queryClient,
  },
  // Since we're using React Query, we don't want loader calls to ever be stale
  // This will ensure that the loader is always called when the route is preloaded or visited
  defaultPreloadStaleTime: 0,
})

export type RouterContext = {
  queryClient: QueryClient
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App router={router} queryClient={queryClient} />
  </StrictMode>,
)

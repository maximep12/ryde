import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Register, RouterProvider } from '@tanstack/react-router'

type AppProps = {
  queryClient: QueryClient
  router: Register['router']
}

function InnerApp({ router }: { router: Register['router'] }) {
  return <RouterProvider router={router} context={{}} />
}

export default function App({ queryClient, router }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <InnerApp router={router} />
    </QueryClientProvider>
  )
}

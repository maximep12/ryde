import { getApi } from '@/stores/api'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin')({
  beforeLoad: async ({ context }) => {
    const { queryClient } = context

    const me = await queryClient.fetchQuery({
      queryKey: ['me'],
      queryFn: async () => {
        const api = getApi()
        const res = await api.auth.me.$get()
        if (!res.ok) throw new Error('Failed to fetch user')
        return res.json()
      },
      staleTime: 1000 * 10,
    })

    if (me?.user?.role !== 'admin' && me?.user?.role !== 'data_manager') {
      throw redirect({ to: '/unauthorized' })
    }
  },
  component: () => <Outlet />,
})

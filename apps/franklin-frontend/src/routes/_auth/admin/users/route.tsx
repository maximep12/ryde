import { getApi } from '@/stores/api'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/users')({
  beforeLoad: async ({ context }) => {
    const { queryClient } = context

    const me = await queryClient.fetchQuery({
      queryKey: ['me'],
      queryFn: async () => {
        const api = getApi()
        const res = await api.example.users.me.$post()
        if (!res.ok) throw new Error('Failed to fetch user')
        return res.json()
      },
      staleTime: 1000 * 10,
    })

    if (me?.role !== 'admin') {
      throw redirect({ to: '/unauthorized' })
    }
  },
  component: () => <Outlet />,
})

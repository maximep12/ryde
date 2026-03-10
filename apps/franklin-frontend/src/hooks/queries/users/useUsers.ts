import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

interface UseUsersParams {
  search?: string
  showActive?: boolean
  showInactive?: boolean
  showPending?: boolean
  page?: number
  pageSize?: number
}

export function useUsers(params: UseUsersParams = {}) {
  const {
    search = '',
    showActive = true,
    showInactive = true,
    showPending = true,
    page = 1,
    pageSize = 20,
  } = params

  return useQuery({
    queryKey: ['users', { search, showActive, showInactive, showPending, page, pageSize }],
    queryFn: async () => {
      const api = getApi()
      const res = await api.example.users.$get({
        query: {
          search: search || undefined,
          showActive: showActive.toString(),
          showInactive: showInactive.toString(),
          showPending: showPending.toString(),
          page: page.toString(),
          pageSize: pageSize.toString(),
        },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch users')
      }
      return res.json()
    },
  })
}

import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

interface UseUsersParams {
  search?: string
  departments?: string[]
  showActive?: boolean
  showInactive?: boolean
  page?: number
  pageSize?: number
}

export function useUsers(params: UseUsersParams = {}) {
  const { search = '', departments, showActive = true, showInactive = true, page = 1, pageSize = 20 } = params

  return useQuery({
    queryKey: ['users', { search, departments, showActive, showInactive, page, pageSize }],
    queryFn: async () => {
      const api = getApi()
      const res = await api.users.$get({
        query: {
          search: search || undefined,
          departments: departments?.length ? departments.join(',') : undefined,
          showActive: showActive.toString(),
          showInactive: showInactive.toString(),
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

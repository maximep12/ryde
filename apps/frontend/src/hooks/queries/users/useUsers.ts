import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const api = getApi()
      const res = await api.users.$get({
        query: { page: '1', pageSize: '100' },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch users')
      }
      return res.json()
    },
  })
}

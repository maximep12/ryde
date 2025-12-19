import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export function useSearchClients(search: string) {
  return useQuery({
    queryKey: ['clients', 'search', search],
    queryFn: async () => {
      const api = getApi()
      const res = await api.clients.search.$get({
        query: { search, limit: '10' },
      })
      if (!res.ok) {
        throw new Error('Failed to search clients')
      }
      return res.json()
    },
    enabled: search.length >= 3,
    staleTime: 30000, // Cache results for 30 seconds
  })
}

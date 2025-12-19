import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export function useClient(id: number) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const api = getApi()
      const res = await api.clients[':id'].$get({
        param: { id: id.toString() },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch client')
      }
      return res.json()
    },
    enabled: !!id,
  })
}

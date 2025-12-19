import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export function useClientOrders(clientId: number, limit = 11) {
  return useQuery({
    queryKey: ['client', clientId, 'orders', limit],
    queryFn: async () => {
      const api = getApi()
      const res = await api.clients[':id'].orders.$get({
        param: { id: clientId.toString() },
        query: { limit: limit.toString() },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch client orders')
      }
      return res.json()
    },
    enabled: !!clientId,
  })
}

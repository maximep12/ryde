import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export function useClientAssortments(clientId: number) {
  return useQuery({
    queryKey: ['client', clientId, 'assortments'],
    queryFn: async () => {
      const api = getApi()
      const res = await api.clients[':id'].assortments.$get({
        param: { id: clientId.toString() },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch client assortments')
      }
      return res.json()
    },
    enabled: !!clientId,
  })
}

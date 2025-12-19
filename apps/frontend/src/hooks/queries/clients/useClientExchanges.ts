import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export function useClientExchanges(clientId: number) {
  return useQuery({
    queryKey: ['client', clientId, 'exchanges'],
    queryFn: async () => {
      const api = getApi()
      const res = await api.clients[':id'].exchanges.$get({
        param: { id: clientId.toString() },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch client exchanges')
      }
      return res.json()
    },
    enabled: !!clientId,
  })
}

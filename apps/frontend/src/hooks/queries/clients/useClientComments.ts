import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export function useClientComments(clientId: number) {
  return useQuery({
    queryKey: ['client', clientId, 'comments'],
    queryFn: async () => {
      const api = getApi()
      const res = await api.clients[':id'].comments.$get({
        param: { id: clientId.toString() },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch client comments')
      }
      return res.json()
    },
    enabled: !!clientId,
  })
}

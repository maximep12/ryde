import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export function useClientOrder(clientId: number, orderId: number) {
  return useQuery({
    queryKey: ['client', clientId, 'order', orderId],
    queryFn: async () => {
      const api = getApi()
      const res = await api.clients[':id'].orders[':orderId'].$get({
        param: { id: clientId.toString(), orderId: orderId.toString() },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch order details')
      }
      return res.json()
    },
    enabled: !!clientId && !!orderId,
  })
}

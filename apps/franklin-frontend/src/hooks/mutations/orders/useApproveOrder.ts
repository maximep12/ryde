import { getApi } from '@/stores/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useApproveOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (orderId: number) => {
      const api = getApi()
      const res = await api.example.orders[':orderId'].approve.$post({
        param: { orderId: orderId.toString() },
      })

      if (!res.ok) {
        const errorData = (await res.json()) as { message?: string }
        throw new Error(errorData.message ?? 'Failed to approve order')
      }

      return res.json() as Promise<{ success: boolean; approvedAt: string }>
    },
    onSuccess: (_, orderId) => {
      // Invalidate the order query to refetch with updated approval info
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      // Also invalidate the orders list
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

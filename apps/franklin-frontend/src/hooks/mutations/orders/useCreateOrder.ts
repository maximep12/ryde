import { getApi } from '@/stores/api'
import { useMutation } from '@tanstack/react-query'

type OrderItem = {
  productName: string
  productSku?: string
  packageType: string
  quantity: number
  unitPrice: number // in cents
}

type CreateOrderInput = {
  clientId: number
  orderDate?: string
  shippingAddress?: string
  notes?: string
  items: OrderItem[]
}

type CreateOrderResponse = {
  order: {
    id: number
    orderNumber: string
    clientId: number
    storeName: string
    totalAmount: number
    itemCount: number
  }
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const api = getApi()
      const res = await api.example.orders.$post({
        json: input,
      })

      if (!res.ok) {
        const errorData = (await res.json()) as { message?: string }
        throw new Error(errorData.message ?? 'Failed to create order')
      }

      return res.json() as Promise<CreateOrderResponse>
    },
  })
}

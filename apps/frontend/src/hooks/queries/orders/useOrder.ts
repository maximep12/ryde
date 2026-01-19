import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export type OrderIssue = {
  id: number
  issueType: string
  severity: string
  title: string
  description: string | null
  status: string
  resolvedAt: string | null
  resolution: string | null
  createdAt: string
}

export type OrderDetails = {
  id: number
  orderNumber: string
  clientId: number
  orderDate: string
  totalAmount: number
  status: string
  source: string
  requiresApproval: boolean
  approvedAt: string | null
  approvedBy: {
    id: string | null
    givenName: string | null
    familyName: string | null
  } | null
  shippingAddress: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  client: {
    id: number
    clientCode: string
    storeName: string
    storeType: string
    contactName: string | null
    email: string
    phone: string | null
    billingAddress: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    country: string | null
    status: string
  }
  items: Array<{
    id: number
    productName: string
    productSku: string | null
    packageType: string
    quantity: number
    unitPrice: number
  }>
  issues: OrderIssue[]
}

export function useOrder(orderId: number) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const api = getApi()
      const res = await api.example.orders[':orderId'].$get({
        param: { orderId: orderId.toString() },
      })

      if (!res.ok) {
        const errorData = (await res.json()) as { message?: string }
        throw new Error(errorData.message ?? 'Failed to fetch order')
      }

      return res.json() as Promise<OrderDetails>
    },
    enabled: orderId > 0,
    retry: false, // Don't retry on 404
  })
}

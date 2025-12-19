import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export type OrdersQueryParams = {
  page?: number
  pageSize?: number
  statuses?: string[]
  sources?: string[]
  search?: string
  date?: string
  hasIssues?: boolean
  hasResolvedIssues?: boolean
  requiresApproval?: boolean
  wasApproved?: boolean
}

export type OrdersResponse = {
  items: Array<{
    id: number
    orderNumber: string
    clientId: number
    orderDate: string
    totalAmount: number
    status: string
    source: string
    shippingAddress: string | null
    notes: string | null
    createdAt: string
    client: {
      id: number
      clientCode: string
      storeName: string
      storeType: string
    }
  }>
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  ordersWithIssuesCount: number
  ordersRequiringApprovalCount: number
}

export function useOrders(params: OrdersQueryParams = {}) {
  const { page = 1, pageSize = 15, statuses, sources, search, date, hasIssues, hasResolvedIssues, requiresApproval, wasApproved } = params

  return useQuery({
    queryKey: ['orders', { page, pageSize, statuses, sources, search, date, hasIssues, hasResolvedIssues, requiresApproval, wasApproved }],
    queryFn: async () => {
      const api = getApi()
      const res = await api.orders.$get({
        query: {
          page: page.toString(),
          pageSize: pageSize.toString(),
          ...(statuses && statuses.length > 0 && { statuses: statuses.join(',') }),
          ...(sources && sources.length > 0 && { sources: sources.join(',') }),
          ...(search && { search }),
          ...(date && { date }),
          ...(hasIssues !== undefined && { hasIssues: hasIssues.toString() }),
          ...(hasResolvedIssues !== undefined && { hasResolvedIssues: hasResolvedIssues.toString() }),
          ...(requiresApproval !== undefined && { requiresApproval: requiresApproval.toString() }),
          ...(wasApproved !== undefined && { wasApproved: wasApproved.toString() }),
        },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch orders')
      }
      return res.json() as Promise<OrdersResponse>
    },
  })
}

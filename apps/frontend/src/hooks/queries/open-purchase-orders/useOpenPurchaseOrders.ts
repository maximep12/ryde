import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export type OpenPurchaseOrdersQueryParams = {
  page?: number
  pageSize?: number
  search?: string
  plants?: string[]
  orderTypes?: string[]
  suppliers?: string[]
}

export type OpenPurchaseOrder = {
  id: number
  createdOn: string | null
  nextScheduleLineDate: string | null
  createdBy: string | null
  purchasingGroupName: string | null
  purchaseOrder: string
  material: string | null
  materialNumber: string | null
  plantName: string | null
  supplier: string | null
  quantityToBeDelivered: string | null
  orderQuantity: string | null
  orderType: string | null
  createdAt: string
  updatedAt: string | null
}

export type OpenPurchaseOrdersResponse = {
  items: OpenPurchaseOrder[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export function useOpenPurchaseOrders(params: OpenPurchaseOrdersQueryParams = {}) {
  const { page = 1, pageSize = 25, search, plants, orderTypes, suppliers } = params

  return useQuery({
    queryKey: [
      'open-purchase-orders',
      {
        page,
        pageSize,
        search,
        plants,
        orderTypes,
        suppliers,
      },
    ],
    queryFn: async () => {
      const api = getApi()
      const res = await api['open-purchase-orders'].$get({
        query: {
          page: page.toString(),
          pageSize: pageSize.toString(),
          ...(search && { search }),
          ...(plants && plants.length > 0 && { plants: plants.join(',') }),
          ...(orderTypes && orderTypes.length > 0 && { orderTypes: orderTypes.join(',') }),
          ...(suppliers && suppliers.length > 0 && { suppliers: suppliers.join(',') }),
        },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch open purchase orders')
      }
      return res.json() as Promise<OpenPurchaseOrdersResponse>
    },
  })
}

export type FilterOption = {
  value: string | null
  count: number
}

export type OpenPurchaseOrdersFilterOptionsResponse = {
  plants: FilterOption[]
  orderTypes: FilterOption[]
  suppliers: FilterOption[]
}

export function useOpenPurchaseOrdersFilterOptions() {
  return useQuery({
    queryKey: ['open-purchase-orders', 'filter-options'],
    queryFn: async () => {
      const api = getApi()
      const res = await api['open-purchase-orders']['filter-options'].$get()
      if (!res.ok) {
        throw new Error('Failed to fetch filter options')
      }
      return res.json() as Promise<OpenPurchaseOrdersFilterOptionsResponse>
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}

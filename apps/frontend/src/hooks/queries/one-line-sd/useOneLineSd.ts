import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export type OneLineSdQueryParams = {
  page?: number
  pageSize?: number
  search?: string
  plantNames?: string[]
  materialGroups?: string[]
  purchasingGroups?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type OneLineSdItem = {
  id: number
  plantName: string
  materialNumber: string
  materialDescription: string | null
  purchasingGroup: string | null
  purchasingGroupName: string | null
  safetyStock: number | null
  materialGroup: string | null
  plannedDeliveryTime: number | null
  createdAt: string
  updatedAt: string | null
}

export type OneLineSdResponse = {
  items: OneLineSdItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export function useOneLineSd(params: OneLineSdQueryParams = {}) {
  const {
    page = 1,
    pageSize = 25,
    search,
    plantNames,
    materialGroups,
    purchasingGroups,
    sortBy,
    sortOrder,
  } = params

  return useQuery({
    queryKey: [
      'one-line-sd',
      {
        page,
        pageSize,
        search,
        plantNames,
        materialGroups,
        purchasingGroups,
        sortBy,
        sortOrder,
      },
    ],
    queryFn: async () => {
      const api = getApi()
      const res = await api['one-line-sd'].$get({
        query: {
          page: page.toString(),
          pageSize: pageSize.toString(),
          ...(search && { search }),
          ...(plantNames && plantNames.length > 0 && { plantNames: plantNames.join(',') }),
          ...(materialGroups &&
            materialGroups.length > 0 && { materialGroups: materialGroups.join(',') }),
          ...(purchasingGroups &&
            purchasingGroups.length > 0 && { purchasingGroups: purchasingGroups.join(',') }),
          ...(sortBy && { sortBy }),
          ...(sortOrder && { sortOrder }),
        },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch one-line S&D')
      }
      return res.json() as Promise<OneLineSdResponse>
    },
  })
}

export type FilterOption = {
  value: string | null
  count: number
}

export type PurchasingGroupFilterOption = FilterOption & {
  label: string | null
}

export type OneLineSdFilterOptionsResponse = {
  plantNames: FilterOption[]
  materialGroups: FilterOption[]
  purchasingGroups: PurchasingGroupFilterOption[]
}

export function useOneLineSdFilterOptions() {
  return useQuery({
    queryKey: ['one-line-sd', 'filter-options'],
    queryFn: async () => {
      const api = getApi()
      const res = await api['one-line-sd']['filter-options'].$get()
      if (!res.ok) {
        throw new Error('Failed to fetch filter options')
      }
      return res.json() as Promise<OneLineSdFilterOptionsResponse>
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}

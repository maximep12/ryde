import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export type InventoryQueryParams = {
  page?: number
  pageSize?: number
  search?: string
  plants?: string[]
  storageLocations?: string[]
  baseUnits?: string[]
}

export type InventoryItem = {
  id: number
  material: string
  materialDescription: string | null
  plant: string
  plantName: string | null
  storageLocation: string | null
  storageLocationDescription: string | null
  specialStockType: string | null
  specialStockTypeDescription: string | null
  unrestrictedStock: number
  stockInQualityInspection: number
  blockedStock: number
  baseUnit: string | null
  createdAt: string
  updatedAt: string | null
}

export type InventoryResponse = {
  items: InventoryItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export function useInventory(params: InventoryQueryParams = {}) {
  const { page = 1, pageSize = 25, search, plants, storageLocations, baseUnits } = params

  return useQuery({
    queryKey: [
      'inventory',
      {
        page,
        pageSize,
        search,
        plants,
        storageLocations,
        baseUnits,
      },
    ],
    queryFn: async () => {
      const api = getApi()
      const res = await api.inventory.$get({
        query: {
          page: page.toString(),
          pageSize: pageSize.toString(),
          ...(search && { search }),
          ...(plants && plants.length > 0 && { plants: plants.join(',') }),
          ...(storageLocations &&
            storageLocations.length > 0 && { storageLocations: storageLocations.join(',') }),
          ...(baseUnits && baseUnits.length > 0 && { baseUnits: baseUnits.join(',') }),
        },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch inventory')
      }
      return res.json() as Promise<InventoryResponse>
    },
  })
}

export type FilterOption = {
  value: string | null
  count: number
}

export type PlantFilterOption = FilterOption & {
  label: string | null
}

export type StorageLocationFilterOption = FilterOption & {
  label: string | null
}

export type InventoryFilterOptionsResponse = {
  plants: PlantFilterOption[]
  storageLocations: StorageLocationFilterOption[]
  baseUnits: FilterOption[]
}

export function useInventoryFilterOptions() {
  return useQuery({
    queryKey: ['inventory', 'filter-options'],
    queryFn: async () => {
      const api = getApi()
      const res = await api.inventory['filter-options'].$get()
      if (!res.ok) {
        throw new Error('Failed to fetch filter options')
      }
      return res.json() as Promise<InventoryFilterOptionsResponse>
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}

import { getApi } from '@/stores/api'
import { useQuery } from '@tanstack/react-query'

export type ProductsQueryParams = {
  page?: number
  pageSize?: number
  search?: string
  productTypes?: string[]
  productGroups?: string[]
  statuses?: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type Product = {
  id: number
  productCode: string
  description: string
  productType: string | null
  productGroup: string | null
  gtin: string | null
  productCategory: string | null
  status: string | null
  statusValidFrom: string | null
  oldProductNumber: string | null
  createdAt: string
  updatedAt: string | null
}

export type ProductsResponse = {
  items: Product[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export function useProducts(params: ProductsQueryParams = {}) {
  const {
    page = 1,
    pageSize = 25,
    search,
    productTypes,
    productGroups,
    statuses,
    sortBy,
    sortOrder,
  } = params

  return useQuery({
    queryKey: [
      'products',
      {
        page,
        pageSize,
        search,
        productTypes,
        productGroups,
        statuses,
        sortBy,
        sortOrder,
      },
    ],
    queryFn: async () => {
      const api = getApi()
      const res = await api.example.products.$get({
        query: {
          page: page.toString(),
          pageSize: pageSize.toString(),
          ...(search && { search }),
          ...(productTypes && productTypes.length > 0 && { productTypes: productTypes.join(',') }),
          ...(productGroups &&
            productGroups.length > 0 && { productGroups: productGroups.join(',') }),
          ...(statuses && statuses.length > 0 && { statuses: statuses.join(',') }),
          ...(sortBy && { sortBy }),
          ...(sortOrder && { sortOrder }),
        },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch products')
      }
      return res.json() as Promise<ProductsResponse>
    },
  })
}

export type FilterOption = {
  value: string | null
  count: number
}

export type ProductFilterOptionsResponse = {
  productTypes: FilterOption[]
  productGroups: FilterOption[]
  statuses: FilterOption[]
}

export function useProductFilterOptions() {
  return useQuery({
    queryKey: ['products', 'filter-options'],
    queryFn: async () => {
      const api = getApi()
      const res = await api.products['filter-options'].$get()
      if (!res.ok) {
        throw new Error('Failed to fetch filter options')
      }
      return res.json() as Promise<ProductFilterOptionsResponse>
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}
